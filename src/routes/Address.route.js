const express = require("express");
const {
  getUserAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  ActiveAddress,
  SuggestAddress,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.post("/create", createAddress);
AddressRoute.get("/:userId", getUserAddress);
AddressRoute.get("/suggest/canada", SuggestAddress);
AddressRoute.put("/update", updateAddress);
AddressRoute.put("/delete", deleteAddress);
AddressRoute.post("/active", ActiveAddress);

module.exports = AddressRoute;
