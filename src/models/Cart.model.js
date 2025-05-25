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
          type: Number, // Changed to Number for calculations
          required: true,
          min: 0,
        },
        sku: {
          skuId: {
            type: mongoose.Schema.Types.ObjectId, // Reference to the SKU's _id
          },
          name: {
            type: String, // e.g., "Iphone 16 black"
          },
          skuName: {
            type: String, // e.g., "black-15"
          },
          images: [
            {
              type: String, // Store SKU-specific images
            },
          ],
        },
        combination: {
          type: Map, // Store the selected combination (e.g., { Storage: 128, RAM: 12 })
          of: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    tiffins: [TiffinEntrySchema],
    totalAmount: {
      type: Number, // Changed to Number for calculations
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", CartSchema);
