const express = require("express");
const {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  getCategoryList,
  getSubCategoryList,
} = require("../controllers/Product.controller");
const upload = require("../middlewares/Multer.middleware");

const ProductRoute = express.Router();

ProductRoute.post("/", getAllProducts);
ProductRoute.post("/create", upload.array("images"), CreateProduct);
ProductRoute.post("/:id", getProductById);
ProductRoute.post("/category/related", RelatedProducts);
ProductRoute.put("/category/:id", EditProduct);
ProductRoute.get("/category", getCategoryList);
ProductRoute.get("/subCategory", getSubCategoryList);

module.exports = ProductRoute;
