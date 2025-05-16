const express = require("express");
const {
  Counts,
  CreateCategory,
  CreateSubCategory,
  getCategoryList,
  getSubCategoryList,
  UploadImages,
  CreateSubSubCategory,
  getSubSubCategoryList,
  UpdateCategory,
  UpdateSubCategory,
  UpdateSubSubCategory,
  DeleteCategory,
  DeleteSubCategory,
  DeleteSubSubCategory,
} = require("../controllers/Count.controller");
const upload = require("../middlewares/Multer.middleware");
const CountRoute = express.Router();

// Get APIs
CountRoute.get("/:id", Counts);
CountRoute.get("/get/category", getCategoryList);
CountRoute.get("/get/subCategory", getSubCategoryList);
CountRoute.get("/get/subsubCategory", getSubSubCategoryList);

// Create APIs
CountRoute.post("/add/category", CreateCategory);
CountRoute.post("/add/subCategory", CreateSubCategory);
CountRoute.post("/add/subsubCategory", CreateSubSubCategory);
CountRoute.post("/upload", upload.array("images"), UploadImages);

// Update APIs
CountRoute.patch("/add/category", UpdateCategory);
CountRoute.patch("/add/subCategory", UpdateSubCategory);
CountRoute.patch("/add/subsubCategory", UpdateSubSubCategory);

// delete APIs
CountRoute.delete("/delete/category", DeleteCategory);
CountRoute.delete("/delete/subCategory", DeleteSubCategory);
CountRoute.delete("/delete/subsubCategory", DeleteSubSubCategory);

module.exports = CountRoute;
