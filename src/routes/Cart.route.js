const express = require("express");
const {
  getUserCart,
  addToCart,
  updateCart,
} = require("../controllers/Cart.controller");
const CartRoute = express.Router();

CartRoute.get("/:userId", getUserCart);
CartRoute.post("/create", addToCart);
CartRoute.put("/update", updateCart);

module.exports = CartRoute;
