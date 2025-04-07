const express = require("express");
const {
  getAllReviews,
  addReviews,
  deleteReviews,
  getTopRatedProducts,
} = require("../controllers/Review.controller");
const ReviewRoute = express.Router();

ReviewRoute.post("/", getAllReviews);
ReviewRoute.post("/add", addReviews);
ReviewRoute.delete("/delete", deleteReviews);
ReviewRoute.get("/top-rated", getTopRatedProducts);

module.exports = ReviewRoute;
