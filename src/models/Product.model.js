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
    discountPrice: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
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
    sizes: [
      {
        size: {
          type: String,
        },
        stock: {
          type: Number,
        },
        priceAdjustment: {
          type: Number,
          default: 0,
        },
      },
    ],
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
      default: null,
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
