const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const CartModel = require("../models/Cart.model");
const WishlistModel = require("../models/Wishlist.model");
const CountryModel = require("../models/Country.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const fs = require("fs").promises;

const Counts = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await CartModel.findOne({ user: id });

    const wishlist = await WishlistModel.findOne({ userid: id });

    let CartItemCount = 0;

    if (cart?.items?.length > 0) {
      const productItemsCount =
        cart.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      CartItemCount = productItemsCount;
    } else {
      if (cart?.tiffins.length > 0) {
        const tiffinItemsCount =
          cart.tiffins?.reduce((acc, item) => acc + item.quantity, 0) || 0;
        CartItemCount = tiffinItemsCount;
      }
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

const UploadImages = async (req, res) => {
  try {
    const imageFiles = req.files || [];

    if (!imageFiles) {
      return res
        .status(400)
        .json(new ApiError(400, "At least one image file is required"));
    }

    const uploadPromises = imageFiles.map((file) =>
      uploadToCloudinary(file.path)
    );

    console.log(uploadPromises);
    const uploadResults = await Promise.all(uploadPromises);

    console.log(uploadResults);
    
    const uploadedImages = uploadResults.map((result, index) => ({
      url: result.secure_url,
      isPrimary: index === 0,
    }));
    
    console.log(uploadedImages);
    if (
      !uploadedImages.every(
        (img) => typeof img.url === "string" && img.url.trim() !== ""
      )
    ) {
      return res
      .status(400)
      .json(new ApiError(400, "All uploaded images must have valid URLs"));
    }
    
    return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images: uploadedImages },
        "Images uploaded successfully"
      )
    );
  } catch (error) {
    console.error("Error uploading images:", error);
    console.log(error);
    return res
    .status(error.statusCode || 500)
    .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Internal server error"
        )
      );
  } finally {
    if (req.files?.images && Array.isArray(req.files.images)) {
      await Promise.all(
        req.files.images.map(async (file) => {
          try {
            if (
              await fs
                .access(file.path)
                .then(() => true)
                .catch(() => false)
            ) {
              await fs.unlink(file.path);
            }
          } catch (error) {
            console.error(`Error removing file ${file.path}:`, error);
          }
        })
      );
    }
  }
};

const getCountryData = async (req, res) => {
  try {
    const countries = await CountryModel.find({});

    return res
      .status(200)
      .json(new ApiResponse(200, countries, "Countries fetched successfully"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const UploadProductImage = async (req, res) => {
  try {
    const imageFiles = req.files || [];

    if (!imageFiles) {
      return res
        .status(400)
        .json(new ApiError(400, "At least one image file is required"));
    }

    const uploadPromises = imageFiles.map((file) =>
      uploadToCloudinary(file.path)
    );

    const uploadResults = await Promise.all(uploadPromises);

    const uploadedImages = uploadResults.map((result, index) => ({
      url: result.secure_url,
      isPrimary: index === 0,
    }));

    if (
      !uploadedImages.every(
        (img) => typeof img.url === "string" && img.url.trim() !== ""
      )
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "All uploaded images must have valid URLs"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { images: uploadedImages },
          "Images uploaded successfully"
        )
      );
  } catch (error) {
    console.error("Error uploading images:", error);
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Internal server error"
        )
      );
  } finally {
    if (req.files?.images && Array.isArray(req.files.images)) {
      await Promise.all(
        req.files.images.map(async (file) => {
          try {
            if (
              await fs
                .access(file.path)
                .then(() => true)
                .catch(() => false)
            ) {
              await fs.unlink(file.path);
            }
          } catch (error) {
            console.error(`Error removing file ${file.path}:`, error);
          }
        })
      );
    }
  }
};

module.exports = {
  Counts,
  UploadImages,
  getCountryData,
  UploadProductImage,
};
