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

    if (!productId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Product ID are required"));
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json(new ApiError(400, "Invalid Product ID"));
    }

    let wishlist = await WishlistModel.findOne({ userid });

    if (wishlist) {
      const alreadyExists = wishlist.items.some(
        (item) => item.toString() === productId.toString()
      );

      if (alreadyExists) {
        return res
          .status(409)
          .json(new ApiError(409, "Product already in wishlist"));
      }

      wishlist.items.push(productId);
      await wishlist.save();
      wishlist = await WishlistModel.findById(wishlist._id).populate("items");
    } else {
      wishlist = await WishlistModel.create({
        userid,
        items: [productId],
      });
      wishlist = await WishlistModel.findById(wishlist._id).populate("items");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, wishlist, "Added to wishlist"));
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    if (error.name === "CastError") {
      return res.status(400).json(new ApiError(400, "Invalid data format"));
    }
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const removeItems = async (req, res) => {
  try {
    const { userid, productId } = req.body;

    if (!productId) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const updatedWishlist = await WishlistModel.findOneAndUpdate(
      { userid: userid },
      { $pull: { items: productId } },
      { new: true }
    );

    if (!updatedWishlist) {
      return res.status(404).json({ message: "Wishlist not found." });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Product removed from wishlist"));
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
