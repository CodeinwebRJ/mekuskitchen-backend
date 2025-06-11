const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    transactionId: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet"],
      default: "card",
    },
    cardType: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "CAD",
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      required: true,
    },
    responseCode: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundStatus: {
      type: String,
      enum: ["not_refunded", "requested", "processing", "success", "failed"],
      default: "not_refunded",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundDetails: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
