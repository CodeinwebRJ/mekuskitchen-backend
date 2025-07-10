const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
    },
    rating: {
      type: Number,
      required: true,
      max: 5,
    },
    comment: {
      type: String,
    },
    isTiffin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Review", ReviewSchema);
