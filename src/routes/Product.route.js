const express = require("express");
const {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
} = require("../controllers/Product.controller");
const upload = require("../middlewares/Multer.middleware");

const ProductRoute = express.Router();

ProductRoute.post("/", getAllProducts);
ProductRoute.post(
  "/create",
  upload.fields([{ name: "productImages" }, { name: "skuImages" }]),
  CreateProduct
);
ProductRoute.post("/:id", getProductById);
ProductRoute.post("/category/related", RelatedProducts);
ProductRoute.put(
  "/category/:id",
  upload.fields([{ name: "productImages" }, { name: "skuImages" }]),
  EditProduct
);

module.exports = ProductRoute;
