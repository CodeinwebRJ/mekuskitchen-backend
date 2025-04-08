const mongoose = require("mongoose");

const CustomizedItemSchema = new mongoose.Schema({
  name: { type: String },
  price: { type: String },
  quantity: { type: String },
  quantityUnit: { type: String },
  description: { type: String },
  included: { type: Boolean, default: true },
});

const TiffinEntrySchema = new mongoose.Schema({
  tiffinMenuId: { type: String, required: true },
  customizedItems: [CustomizedItemSchema],
  specialInstructions: { type: String },
  orderDate: { type: String },
  day: { type: String },
  quantity: { type: Number, default: 1 },
  totalAmount: { type: String },
});

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },
    items: [
      {
        product: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: String, required: true },
      },
    ],
    tiffins: [TiffinEntrySchema],
    totalAmount: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", CartSchema);
