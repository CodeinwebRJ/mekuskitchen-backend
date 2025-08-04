const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const WishlistModel = require("../models/Wishlist.model");
const mongoose = require("mongoose");

const getUserWishlist = async (req, res) => {
  try {
    const { userid } = req.params;

    if (!userid) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const wishlist = await WishlistModel.findOne({ userid }).populate("items");

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
    const { userid, productId } = req.body;

    if (!userid || !productId) {
      return res
        .status(400)
        .json(new ApiError(400, "Both User ID and Product ID are required"));
    }

    if (!productId) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid Product ID format"));
    }

    let wishlist = await WishlistModel.findOne({ userid });

    if (wishlist) {
      const alreadyExists = wishlist.items.some(
        (item) => item.toString() === productId
      );

      if (alreadyExists) {
        return res
          .status(409)
          .json(new ApiError(409, "Product already exists in wishlist"));
      }

      wishlist.items.push(productId);
      await wishlist.save();
    } else {
      wishlist = await WishlistModel.create({
        userid,
        items: [productId],
      });
    }

    const populatedWishlist = await WishlistModel.findById(
      wishlist._id
    ).populate("items");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          populatedWishlist,
          "Product added to wishlist successfully"
        )
      );
  } catch (error) {
    console.error("Error in addToWishlist:", error.message);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const removeItems = async (req, res) => {
  try {
    const { userid, productId } = req.body;

    if (!userid || !productId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Product ID are required"));
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json(new ApiError(400, "Invalid Product ID"));
    }

    const updatedWishlist = await WishlistModel.findOneAndUpdate(
      { userid },
      { $pull: { items: productId } },
      { new: true }
    );

    if (!updatedWishlist) {
      return res.status(404).json(new ApiError(404, "Wishlist not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedWishlist, "Product removed from wishlist")
      );
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  getUserWishlist,
  addToWishlist,
  removeItems,
};
