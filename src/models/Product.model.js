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
    product_name: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, trim: true },
    price: { type: Number, required: true },
    image_url: [{ type: String, trim: true }],
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    stock: { type: Number, required: true },
    longDescription: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    features: [{ type: String, trim: true }],
    attributes: [
      {
        name: { type: String, required: true, trim: true },
        type: { type: String, required: true },
        options: [{ type: String, trim: true }],
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
