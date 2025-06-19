const express = require("express");
const {
  getCategoryList,
  getSubCategoryList,
  getSubSubCategoryList,
  CreateCategory,
  CreateSubCategory,
  CreateSubSubCategory,
  UpdateCategory,
  UpdateSubCategory,
  UpdateSubSubCategory,
  DeleteCategory,
  DeleteSubCategory,
  DeleteSubSubCategory,
} = require("../controllers/Categories.controller");

const CategoriesRoute = express.Router();

CategoriesRoute.get("/get/category", getCategoryList);
CategoriesRoute.get("/get/subCategory", getSubCategoryList);
CategoriesRoute.get("/get/subsubCategory", getSubSubCategoryList);

// Create APIs
CategoriesRoute.post("/add/category", CreateCategory);
CategoriesRoute.post("/add/subCategory", CreateSubCategory);
CategoriesRoute.post("/add/subsubCategory", CreateSubSubCategory);

// Update APIs
CategoriesRoute.patch("/add/category", UpdateCategory);
CategoriesRoute.patch("/add/subCategory", UpdateSubCategory);
CategoriesRoute.patch("/add/subsubCategory", UpdateSubSubCategory);

// delete APIs
CategoriesRoute.delete("/delete/category", DeleteCategory);
CategoriesRoute.delete("/delete/subCategory", DeleteSubCategory);
CategoriesRoute.delete("/delete/subsubCategory", DeleteSubSubCategory);

module.exports = CategoriesRoute;
