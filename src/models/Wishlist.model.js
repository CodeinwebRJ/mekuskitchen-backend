const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema(
  {
    userid: {
      type: String,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("wishlist", WishlistSchema);
