const mongoose = require("mongoose");

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
    Active: { type: Boolean },
    attributes: [
      {
        name: { type: String },
        type: { type: String },
        options: [{ type: String }],
        defaultValue: mongoose.Schema.Types.Mixed,
        priceMap: { type: Map, of: Number },
      },
    ],
    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: (doc, ret) => {
        delete ret.Active;
        return ret;
      },
    },
  }
);

ProductSchema.index({ product_name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);
