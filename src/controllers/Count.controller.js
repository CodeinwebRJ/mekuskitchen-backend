const ProductModel = require("../models/Product.model");
const TiffinModel = require("../models/TiffinMenu.model");
const CartModel = require("../models/Cart.model");
const WishlistModel = require("../models/Wishlist.model");
const ReviewModel = require("../models/Review.model");
const OrderModel = require("../models/Order.model");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const Counts = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await CartModel.findOne({ user: id });
    const wishlist = await WishlistModel.findOne({ userid: id });

    let CartItemCount = 0;

    if (cart.items.length > 0) {
      const productItemsCount =
        cart.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      CartItemCount = productItemsCount;
    } else {
      const tiffinItemsCount =
        cart.tiffins?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      CartItemCount = tiffinItemsCount;
    }

    const WishListItemCount = wishlist?.items?.length || 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          CartItemCount,
          WishListItemCount,
        },
        "Counts fetched successfully"
      )
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  Counts,
};
