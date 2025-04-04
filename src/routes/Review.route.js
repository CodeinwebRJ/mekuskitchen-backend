const express = require("express");
const {
  getAllReviews,
  addReviews,
  deleteReviews,
} = require("../controllers/Review.controller");
const ReviewRoute = express.Router();

ReviewRoute.post("/", getAllReviews);
ReviewRoute.post("/add", addReviews);
ReviewRoute.delete("/delete", deleteReviews);

module.exports = ReviewRoute;
