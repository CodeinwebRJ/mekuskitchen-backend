const express = require("express");
const {
  getAllProducts,
  CreateProduct,
  getProductById,
} = require("../controllers/Product.controller");
const upload = require("../middlewares/Multer.middleware");

const ProductRoute = express.Router();

ProductRoute.post("/", getAllProducts);
ProductRoute.post("/create", upload.array("image"), CreateProduct);
ProductRoute.post("/:id", getProductById);

module.exports = ProductRoute;
