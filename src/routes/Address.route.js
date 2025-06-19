const express = require("express");
const {
  getUserAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  ActiveAddress,
  SuggestAddress,
  RetrieveAddressDetails,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.post("/create", createAddress);
AddressRoute.get("/:userId", getUserAddress);
AddressRoute.get("/suggest/canada", SuggestAddress);
AddressRoute.get("/retrive/canada", RetrieveAddressDetails);
AddressRoute.put("/update", updateAddress);
AddressRoute.put("/delete", deleteAddress);
AddressRoute.post("/active", ActiveAddress);

module.exports = AddressRoute;
