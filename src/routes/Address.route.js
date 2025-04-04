const express = require("express");
const {
  getUserAddress,
  createAddress,
  updateAddress,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.get("/:userId", getUserAddress);
AddressRoute.post("/create", createAddress);
AddressRoute.post("/update", updateAddress);

module.exports = AddressRoute;
