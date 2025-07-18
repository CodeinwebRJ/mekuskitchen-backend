const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ReviewModel = require("../models/Review.model");
const ProductModel = require("../models/Product.model");
const TiffinMenuModel = require("../models/TiffinMenu.model");

const getAllReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const reviews = await ReviewModel.find({ product_id: productId })
      .populate("product_id", "name")
      .sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
      return res.status(200).json(new ApiResponse(200, [], "No reviews found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const addReviews = async (req, res) => {
  try {
    const { rating, comment, product_id, user_id } = req.body;

    if (!product_id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }
    if (!rating) {
      return res.status(400).json(new ApiError(400, "Rating is required"));
    }

    const review = await ReviewModel.create({
      product_id,
      user_id,
      rating,
      comment,
    });

    const result = await ReviewModel.aggregate([
      {
        $match: {
          product_id: product_id.toString(),
        },
      },
      {
        $group: {
          _id: "$product_id",
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const newAverageRating = result.length > 0 ? result[0].avgRating : 0;

    await ProductModel.findByIdAndUpdate(
      product_id,
      { averageRating: newAverageRating },
      { new: true }
    );

    return res
      .status(201)
      .json(new ApiResponse(201, review, "Review added successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal Server Error"));
  }
};

const deleteReviews = async (req, res) => {
  try {
    const { id, user_id } = req.body;

    if (!id) {
      return res.status(400).json(new ApiError(400, "Review ID is required"));
    }

    const review = await ReviewModel.findById(id);

    if (!review) {
      return res.status(400).json(new ApiError(404, "Review not found"));
    }

    if (review.user_id.toString() !== user_id) {
      return res
        .status(400)
        .json(new ApiError(403, "Not authorized to delete this review"));
    }

    await ReviewModel.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Review deleted successfully"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiResponse(500, "Internal Server Error"));
  }
};

const getTopRatedProducts = async (req, res) => {
  try {
    const topProducts = await ProductModel.find({ isActive: true })
      .sort({ averageRating: -1 })
      .limit(3);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          topProducts,
          "Top rated products fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const addTiffinReview = async (req, res) => {
  try {
    const { rating, comment, product_id, user_id } = req.body;

    if (!product_id) {
      return res.status(400).json(new ApiError(400, "Tiffin ID is required"));
    }

    if (!rating) {
      return res
        .status(400)
        .json(new ApiError(400, "Rating is required"));
    }

    const tiffin = await TiffinMenuModel.findById(product_id);
    if (!tiffin) {
      return res.status(404).json(new ApiError(404, "Tiffin not found"));
    }

    const review = await ReviewModel.create({
      product_id,
      user_id,
      rating,
      comment,
      isTiffin: true,
    });

    const result = await ReviewModel.aggregate([
      { $match: { product_id: product_id } },
      { $group: { _id: "$product_id", avgRating: { $avg: "$rating" } } },
    ]);

    const newAverageRating = result.length > 0 ? result[0].avgRating : 0;

    await TiffinMenuModel.findByIdAndUpdate(
      product_id,
      { averageRating: newAverageRating },
      { new: true }
    );

    return res
      .status(201)
      .json(new ApiResponse(201, review, "Review added successfully"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getTiffinReviews = async (req, res) => {
  try {
    const { tiffinId } = req.params;

    if (!tiffinId) {
      return res.status(400).json(new ApiError(400, "Tiffin ID is required"));
    }

    const reviews = await ReviewModel.find({
      product_id: tiffinId,
      isTiffin: true,
    }).sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No reviews found for this tiffin"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, reviews, "Tiffin reviews fetched successfully")
      );
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const deleteTiffinReview = async (req, res) => {
  try {
    const { id, user_id } = req.body;

    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json(new ApiError(404, "Review not found"));
    }

    if (review.user_id?.toString() !== user_id) {
      return res
        .status(403)
        .json(new ApiError(403, "Not authorized to delete this review"));
    }

    await ReviewModel.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tiffin review deleted successfully"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  getAllReviews,
  addReviews,
  deleteReviews,
  getTopRatedProducts,
  addTiffinReview,
  getTiffinReviews,
  deleteTiffinReview,
};
