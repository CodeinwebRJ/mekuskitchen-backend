const express = require("express");
const {
  getUserCart,
  addToCart,
  updateCart,
  bulkUploadCartItems,
} = require("../controllers/Cart.controller");
const CartRoute = express.Router();

CartRoute.get("/:userId", getUserCart);
CartRoute.post("/create", addToCart);
CartRoute.put("/update", updateCart);
CartRoute.post("/bulk", bulkUploadCartItems);

module.exports = CartRoute;
