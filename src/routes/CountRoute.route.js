const express = require("express");
const {
  Counts,
  CreateCategory,
  CreateSubCategory,
  getCategoryList,
  getSubCategoryList,
} = require("../controllers/Count.controller");
const CountRoute = express.Router();

CountRoute.get("/:id", Counts);
CountRoute.post("/add/category", CreateCategory);
CountRoute.post("/add/subCategory", CreateSubCategory);
CountRoute.get("/category", getCategoryList);
CountRoute.get("/subCategory", getSubCategoryList);

module.exports = CountRoute;
