const express = require("express");
const {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  HomePageProduct,
  DeleteProduct,
  SearchProducts,
} = require("../controllers/Product.controller");

const ProductRoute = express.Router();

ProductRoute.post("/", getAllProducts);
ProductRoute.post("/create", CreateProduct);
ProductRoute.get("/:id", getProductById);
ProductRoute.post("/category/related", RelatedProducts);
ProductRoute.put("/category/:id", EditProduct);
ProductRoute.delete("/category/delete/:id", DeleteProduct);
ProductRoute.get("/category/home", HomePageProduct);
ProductRoute.get("/category/search", SearchProducts);

module.exports = ProductRoute;
