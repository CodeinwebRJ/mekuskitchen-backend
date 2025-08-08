const axios = require("axios");
const xml2js = require("xml2js");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const PaymentModel = require("../models/Payment.model");

const MONERIS_API_URL =
  process.env.MONARIS_ENV === "production"
    ? "https://www3.moneris.com/gateway2/servlet/MpgRequest"
    : "https://esqa.moneris.com/gateway2/servlet/MpgRequest";

const generateOrderId = () => {
  const now = Date.now().toString();
  const trimmed = now.slice(-8);
  const random = Math.floor(100000000 + Math.random() * 900000000);
  return trimmed + random.toString();
};

const buildXmlRequest = (
  orderId,
  amount,
  pan,
  expdate,
  // cvv,
  cryptType = "7"
) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <store_id>${process.env.MONERIS_STORE_ID}</store_id>
  <api_token>${process.env.MONERIS_API_TOKEN}</api_token>
  <purchase>
    <order_id>${orderId}</order_id>
    <cust_id>customer1</cust_id>
    <amount>${amount}</amount>
    <pan>${pan}</pan>
    <expdate>${expdate}</expdate>
    <crypt_type>${cryptType}</crypt_type>
  </purchase>
</request>`;
};

const buildRefundXml = (orderId, amount, txnNumber) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <store_id>${process.env.MONERIS_STORE_ID}</store_id>
  <api_token>${process.env.MONERIS_API_TOKEN}</api_token>
  <refund>
    <order_id>${orderId}</order_id>
    <amount>${Number(amount).toFixed(2)}</amount>
    <txn_number>${txnNumber}</txn_number>
    <crypt_type>7</crypt_type>
  </refund>
</request>`;
};

const CreatePayment = async (req, res) => {
  try {
    const { userId, amount, cardNumber, expiryDate, cvv } = req.body;

    if (!amount || !cardNumber || !expiryDate || !cvv) {
      return res.status(400).json(new ApiError(400, "Missing payment data"));
    }

    let cleanedCardNumber = cardNumber.replace(/\s/g, "").replace(/\D/g, "");
    let expdate = expiryDate.replace(/\D/g, "");
    if (expdate.length === 4) {
      const mm = expdate.slice(0, 2);
      const yy = expdate.slice(2, 4);
      expdate = yy + mm;
    }

    const orderId = generateOrderId();
    const xmlPayload = buildXmlRequest(
      orderId,
      amount,
      cleanedCardNumber,
      expdate,
      cvv
    );

    const monerisResponse = await axios.post(MONERIS_API_URL, xmlPayload, {
      headers: {
        "Content-Type": "text/xml",
      },
    });

    const parsed = await xml2js.parseStringPromise(monerisResponse.data, {
      explicitArray: false,
    });

    const receipt = parsed.response.receipt;

    const paymentRes = await PaymentModel.create({
      userId,
      orderId,
      transactionId: receipt.TransID || null,
      paymentMethod: "card",
      cardType: receipt.CardType || null,
      amount: parseFloat(amount),
      status: parseInt(receipt.ResponseCode) < 50 ? "success" : "failed",
      responseCode: receipt.ResponseCode,
      message: receipt.Message,
      rawResponse: receipt,
    });
    if (paymentRes.status === "failed") {
      return res.status(400).json(
        new ApiError(400, "Payment failed: " + receipt.Message)
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, paymentRes, "Payment processed"));
  } catch (error) {
    console.error("Payment error:", error?.response?.data || error.message);
    return res.status(500).json(new ApiError(500, "Payment failed"));
  }
};

const getUserPayments = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json(new ApiError(400, "Invalid userId"));
  }

  const payments = await PaymentModel.find({ userId }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, payments, "User payment history"));
};

const getPaymentById = async (req, res) => {
  const { orderId } = req.params;

  const payment = await PaymentModel.findOne({ orderId });

  if (!payment) {
    return res.status(404).json(new ApiError(404, "Payment not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, payment, "Payment details fetched"));
};

const refundPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await PaymentModel.findOne({ orderId });

    if (!payment) {
      return res.status(404).json(new ApiError(404, "Payment not found"));
    }

    if (payment.isRefunded || payment.refundStatus === "success") {
      return res
        .status(400)
        .json(new ApiError(400, "Payment has already been refunded"));
    }

    await PaymentModel.updateOne(
      { orderId },
      { $set: { refundStatus: "processing" } }
    );

    const xmlPayload = buildRefundXml(
      payment.orderId,
      payment.amount.toFixed(2),
      payment.transactionId
    );

    const response = await axios.post(MONERIS_API_URL, xmlPayload, {
      headers: { "Content-Type": "text/xml" },
    });

    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    const refundReceipt = parsed.response.receipt;

    const isSuccess =
      refundReceipt.Complete === "true" &&
      refundReceipt.ResponseCode &&
      parseInt(refundReceipt.ResponseCode) < 50;

    await PaymentModel.updateOne(
      { orderId },
      {
        $set: {
          isRefunded: isSuccess,
          refundStatus: isSuccess ? "success" : "failed",
          refundAmount: parseFloat(refundReceipt.TransAmount || 0),
          refundDetails: refundReceipt,
        },
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          refundReceipt,
          isSuccess ? "Refund successful" : "Refund failed"
        )
      );
  } catch (error) {
    console.error("Refund error:", error.message);
    await PaymentModel.updateOne(
      { orderId: req.params.orderId },
      { $set: { refundStatus: "failed" } }
    );
    return res.status(500).json(new ApiError(500, "Refund failed"));
  }
};

const DeletePayment = async (req, res) => {
  const { orderId } = req.params;

  const result = await PaymentModel.findOneAndDelete({ orderId });

  if (!result) {
    return res.status(404).json(new ApiError(404, "Payment not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Payment deleted successfully"));
};

const getRefundStatus = async (req, res) => {
  const { orderId } = req.params;

  const payment = await PaymentModel.findOne({ orderId });

  if (!payment) {
    return res.status(404).json(new ApiError(400, "payment not found"));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: payment.orderId,
        refundStatus: payment.refundStatus,
        refundAmount: payment.refundAmount,
        refundDetails: payment.refundDetails,
      },
      "Refund status fetched"
    )
  );
};

module.exports = {
  CreatePayment,
  getUserPayments,
  getPaymentById,
  refundPayment,
  DeletePayment,
  getRefundStatus,
};
