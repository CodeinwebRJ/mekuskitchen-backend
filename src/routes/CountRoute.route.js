const express = require("express");
const {
  Counts,
  CreateCategory,
  CreateSubCategory,
  getCategoryList,
  getSubCategoryList,
  UploadImages,
} = require("../controllers/Count.controller");
const upload = require("../middlewares/Multer.middleware");
const CountRoute = express.Router();

CountRoute.get("/:id", Counts);
CountRoute.post("/add/category", CreateCategory);
CountRoute.post("/add/subCategory", CreateSubCategory);
CountRoute.get("/get/category", getCategoryList);
CountRoute.get("/get/subCategory", getSubCategoryList);
CountRoute.post("/upload", upload.array("images"), UploadImages);

module.exports = CountRoute;
