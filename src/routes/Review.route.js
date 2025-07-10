const express = require("express");
const {
  getAllReviews,
  addReviews,
  deleteReviews,
  getTopRatedProducts,
  addTiffinReview,
  getTiffinReviews,
  deleteTiffinReview,
} = require("../controllers/Review.controller");
const ReviewRoute = express.Router();

ReviewRoute.get("/:productId", getAllReviews);
ReviewRoute.post("/addreview", addReviews);
ReviewRoute.delete("/delete", deleteReviews);
ReviewRoute.get("/product/top-rated", getTopRatedProducts);
ReviewRoute.get("/tiffin/all", getTiffinReviews);
ReviewRoute.post("/tiffin/add", addTiffinReview);
ReviewRoute.get("/tiffin/delete", deleteTiffinReview);

module.exports = ReviewRoute;
