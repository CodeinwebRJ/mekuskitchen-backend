const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ReviewModel = require("../models/Review.model");
const ProductModel = require("../models/Product.model");

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
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json(new ApiError(400, "Rating must be between 1 and 5"));
    }

    const review = await ReviewModel.create({
      product_id,
      user_id,
      rating,
      comment,
    });

    const savedReview = await review.save();

    return res
      .status(201)
      .json(new ApiResponse(201, savedReview, "Review added successfully"));
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
    const topProducts = await ReviewModel.aggregate([
      {
        $group: {
          _id: "$product_id",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
      {
        $sort: {
          averageRating: -1,
        },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          productId: "$_id",
          averageRating: { $round: ["$averageRating", 2] },
          totalReviews: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(new ApiResponse(200, topProducts, "Top products"));
  } catch (error) {
    res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
module.exports = {
  getAllReviews,
  addReviews,
  deleteReviews,
  getTopRatedProducts,
};
