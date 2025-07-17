const express = require("express");
const {
  getUserCart,
  addToCart,
  updateCart,
  bulkUploadTiffinCart,
  bulkUploadProductCart,
} = require("../controllers/Cart.controller");
const CartRoute = express.Router();

CartRoute.get("/:userId", getUserCart);
CartRoute.post("/create", addToCart);
CartRoute.put("/update", updateCart);
CartRoute.post("/product/bulk", bulkUploadProductCart);
CartRoute.post("/tiffin/bulk", bulkUploadTiffinCart);

module.exports = CartRoute;
