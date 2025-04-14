const mongoose = require("mongoose");

const TiffinMenuSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
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
          type: String,
        },
        quantityUnit: {
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
    subTotal: {
      type: String,
    },
    image_url: [
      {
        type: String,
        required: true,
      },
    ],
    totalAmount: {
      type: String,
    },
    Active: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TiffinMenu", TiffinMenuSchema);
