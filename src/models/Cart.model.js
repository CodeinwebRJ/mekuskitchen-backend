const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },
    items: [
      {
        product: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: String,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", CartSchema);
