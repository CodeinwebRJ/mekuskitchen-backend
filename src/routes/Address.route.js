const express = require("express");
const {
  getUserAddress,
  deleteAddress,
  ActiveAddress,
  SuggestAddress,
  RetrieveAddressDetails,
  createOrUpdateAddress,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.post("/create", createOrUpdateAddress);
AddressRoute.get("/:userId", getUserAddress);
AddressRoute.get("/suggest/canada", SuggestAddress);
AddressRoute.get("/retrive/canada", RetrieveAddressDetails);
AddressRoute.put("/delete", deleteAddress);
AddressRoute.post("/active", ActiveAddress);

module.exports = AddressRoute;
