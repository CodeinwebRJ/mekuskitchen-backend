const mongoose = require("mongoose");

const TiffinMenuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    day: {
      type: String,
      required: true,
    },
    items: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        weightUnit: {
          type: String,
        },
        weight: {
          type: String,
        },
        description: {
          type: String,
        },
      },
    ],
    date: {
      type: String,
    },
    endDate: {
      type: String,
    },
    subTotal: {
      type: String,
    },
    isCustomized: {
      type: Boolean,
    },
    image_url: [
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
    totalAmount: {
      type: String,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    aboutItem: [
      {
        type: String,
      },
    ],
    Active: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TiffinMenu", TiffinMenuSchema);
