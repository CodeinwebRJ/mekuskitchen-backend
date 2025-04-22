const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const WishlistModel = require("../models/Wishlist.model");

const getUserWishlist = async (req, res) => {
  try {
    const { userid } = req.params;

    if (!userid) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const wishlist = await WishlistModel.findOne({ userid }).populate(
      "items.productId"
    );

    if (!wishlist) {
      return res
        .status(404)
        .json(new ApiError(404, "Wishlist not found for this user"));
    }

    return res.status(200).json(new ApiResponse(200, wishlist, "Success"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { userid, product_id } = req.body;

    if (!userid || !product_id) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Product ID are required"));
    }

    let wishlist = await WishlistModel.findOne({ userid });

    if (wishlist) {
      const alreadyExists = wishlist.items.some(
        (item) => item.productId.toString() === product_id.toString()
      );

      if (alreadyExists) {
        return res
          .status(409)
          .json(new ApiError(409, "Product already in wishlist"));
      }

      wishlist.items.push({ productId: product_id });
      await wishlist.save();
      wishlist = await wishlist.populate("items.productId");
    } else {
      wishlist = await WishlistModel.create({
        userid,
        items: [{ productId: product_id }],
      });
      wishlist = await wishlist.populate("items.productId");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, wishlist, "Added to wishlist"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const removeItems = async (req, res) => {
  try {
    const { userid, productId } = req.body;

    console.log("User ID:", userid, "Product ID:", productId);

    if (!userid || !productId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Product ID are required"));
    }

    const wishlist = await WishlistModel.findOne({ userid });

    if (!wishlist) {
      return res.status(404).json(new ApiError(404, "Wishlist not found"));
    }

    const originalLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );

    if (wishlist.items.length === originalLength) {
      return res
        .status(404)
        .json(new ApiError(404, "Product not found in wishlist"));
    }

    await wishlist.save();
    await WishlistModel.findOne({ userid }).populate("items.productId");

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Product removed from wishlist"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  getUserWishlist,
  addToWishlist,
  removeItems,
};
