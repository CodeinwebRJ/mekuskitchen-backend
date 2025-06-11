const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: Number,
  },
  userId: {
    type: String,
    required: true,
  },
  cartId: {
    type: String,
    required: true,
  },
  addressId: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
  },
  orderStatus: {
    type: String,
    enum: [
      "Pending",
      "Confirmed",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ],
  },
  deliveryTime: {
    type: Date,
  },
  cartAmount: {
    type: Number,
  },
  discount: {
    type: Number,
  },
  deliveryFee: {
    type: Number,
  },
  taxAmount: {
    type: Number,
  },
  grandTotal: {
    type: Number,
  },
  discountAmount: {
    type: Number,
  },
  notes: {
    type: String,
  },
  cartItems: {
    type: Array,
  },
  Orderdate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
