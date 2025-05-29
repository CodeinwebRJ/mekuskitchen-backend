const express = require("express");
const {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  HomePageProduct,
} = require("../controllers/Product.controller");

const ProductRoute = express.Router();

ProductRoute.post("/", getAllProducts);
ProductRoute.post("/create", CreateProduct);
ProductRoute.get("/:id", getProductById);
ProductRoute.post("/category/related", RelatedProducts);
ProductRoute.put("/category/:id", EditProduct);
ProductRoute.get("/category/home", HomePageProduct);

module.exports = ProductRoute;
