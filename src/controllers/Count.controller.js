const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const CartModel = require("../models/Cart.model");
const WishlistModel = require("../models/Wishlist.model");
const CountryModel = require("../models/Country.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { Country: CscCountry, State, City } = require("country-state-city");
const { default: axios } = require("axios");
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

const getCities = async (req, res) => {
  try {
    const countries = await CountryModel.find({});

    for (const countryDoc of countries) {
      const countryName = countryDoc.country;

      const updatedStates = [];

      for (const stateObj of countryDoc.State || []) {
        const stateName = stateObj;

        try {
          const apiRes = await axios.post(
            "https://countriesnow.space/api/v0.1/countries/state/cities",
            {
              country: countryName,
              state: stateName,
            }
          );

          console.log(apiRes)

          if (apiRes.data && apiRes.data.data) {
            const cities = apiRes.data.data;

            updatedStates.push({
              state: stateName,
              cities,
            });

            console.log(`Fetched cities for ${countryName} - ${stateName}`);
          } else {
            console.warn(`No cities found for ${countryName} - ${stateName}`);
          }
        } catch (apiErr) {
          console.error(
            `API error for ${countryName} - ${stateName}:`,
            apiErr.message
          );
        }
      }
      countryDoc.states = updatedStates;
      await countryDoc.save();
      console.log(`Updated country: ${countryName}`);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "All states updated with cities"));
  } catch (error) {
    console.error("Internal error:", error.message);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  Counts,
  UploadImages,
  getCountryData,
  getCities,
};
