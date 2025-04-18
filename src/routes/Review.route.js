const express = require("express");
const {
  getAllReviews,
  addReviews,
  deleteReviews,
  getTopRatedProducts,
} = require("../controllers/Review.controller");
const ReviewRoute = express.Router();

ReviewRoute.get("/:productId", getAllReviews);
ReviewRoute.post("/addreview", addReviews);
ReviewRoute.delete("/delete", deleteReviews);
ReviewRoute.get("/product/top-rated", getTopRatedProducts);

module.exports = ReviewRoute;
