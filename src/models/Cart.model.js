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
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number, 
          required: true,
          min: 0,
        },
        sku: {
          skuId: {
            type: mongoose.Schema.Types.ObjectId, 
          },
          name: {
            type: String, 
          },
          skuName: {
            type: String, 
          },
          images: [
            {
              type: String,
            },
          ],
        },
        combination: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    tiffins: [TiffinEntrySchema],
    totalAmount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", CartSchema);
