const express = require("express");
const {
  getUserWishlist,
  addToWishlist,
  removeItems,
} = require("../controllers/Wishlist.controller");
const WishlistRoute = express.Router();

WishlistRoute.get("/:userid", getUserWishlist);
WishlistRoute.post("/create", addToWishlist);
WishlistRoute.put("/remove", removeItems);

module.exports = WishlistRoute;
