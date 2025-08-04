const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  cartId: {
    type: String,
    required: true,
  },
  trackingNumber: {
    type: String,
  },
  addressId: {
    type: String,
  },
  paymentMethod: {
    type: String,
  },
  paymentId: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
  },
  orderStatus: {
    type: String,
    enum: ["Pending", "Delivered", "Cancelled"],
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
  tiffinItems: {
    type: Array,
  },
  selfPickup: {
    type: Boolean,
    default: false,
  },
  Orderdate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
