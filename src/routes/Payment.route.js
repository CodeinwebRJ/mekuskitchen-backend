const express = require("express");
const {
  CreatePayment,
  getUserPayments,
  getPaymentById,
  refundPayment,
  DeletePayment,
  getRefundStatus,
} = require("../controllers/Payment.controller");
const PaymentRoute = express.Router();

PaymentRoute.post("/create", CreatePayment);
PaymentRoute.get("/history/:userId", getUserPayments);
PaymentRoute.get("/:orderId", getPaymentById);
PaymentRoute.post("/refund/:orderId", refundPayment);
PaymentRoute.delete("/:orderId", DeletePayment);
PaymentRoute.get("/status/:orderId", getRefundStatus);

module.exports = PaymentRoute;
