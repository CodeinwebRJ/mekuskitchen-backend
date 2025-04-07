const express = require("express");
const {
  getUserAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.post("/create", createAddress);
AddressRoute.get("/:userId", getUserAddress);
AddressRoute.put("/update", updateAddress);
AddressRoute.put("/delete", deleteAddress);

module.exports = AddressRoute;
