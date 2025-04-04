const express = require("express");
const {
  getUserCart,
  addToCart,
  updateCart,
} = require("../controllers/Cart.controller");
const CartRoute = express.Router();

CartRoute.get("/:user_id", getUserCart);
CartRoute.post("/add", addToCart);
CartRoute.put("/update", updateCart);

module.exports = CartRoute;
