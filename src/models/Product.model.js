const mongoose = require("mongoose");

// const VariantSchema = new mongoose.Schema({
//   sku: { type: String, trim: true },
//   price: { type: Number, required: true, min: 0 },
//   stock: { type: Number, required: true, min: 0 },
//   attributes: {
//     type: Map,
//     of: String,
//     required: true,
//   },
//   image_url: [
//     {
//       type: String,
//       trim: true,
//     },
//   ],
// });

const ProductSchema = new mongoose.Schema(
  {
    product_name: { type: String },
    category: { type: String },
    subCategory: { type: String },
    price: { type: Number },
    image_url: [{ type: String }],
    title: { type: String },
    description: { type: String },
    stock: { type: Number },
    longDescription: { type: String },
    keywords: [{ type: String }],
    features: [{ type: String }],
    attributes: [
      {
        name: { type: String },
        type: { type: String },
        options: [{ type: String }],
        defaultValue: mongoose.Schema.Types.Mixed,
        priceMap: { type: Map, of: Number },
      },
    ],
    // variants: [VariantSchema],
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ product_name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);
