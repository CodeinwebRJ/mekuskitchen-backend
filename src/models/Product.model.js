const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
    },
    price: {
      type: String,
      required: true,
    },
    image_url: [
      {
        type: String,
        required: true,
      },
    ],
    title: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", ProductSchema);
