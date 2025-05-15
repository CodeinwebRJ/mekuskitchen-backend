const mongoose = require("mongoose");

const ProductSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    SKUName: {
      type: String,
      required: true,
    },
    images: [
      {
        url: {
          type: String,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    stock: {
      type: Number,
    },
    sku: [
      {
        details: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    category: {
      type: String,
      trim: true,
      default: null,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    ProductCategory: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: null,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    weight: {
      type: Number,
      default: null,
    },
    weightUnit: {
      type: String,
      default: null,
    },
    dimensions: {
      length: {
        type: Number,
        min: 0,
      },
      width: {
        type: Number,
        min: 0,
      },
      height: {
        type: Number,
        min: 0,
      },
      dimensionUnit: {
        type: String,
      },
    },
    productDetail: [
      {
        details: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;
