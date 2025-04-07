const express = require("express");
const {
  getUserAddress,
  createAddress,
  updateAddress,
} = require("../controllers/Address.controller");
const AddressRoute = express.Router();

AddressRoute.post("/create", createAddress);
AddressRoute.get("/:userId", getUserAddress);
AddressRoute.put("/update", updateAddress);

module.exports = AddressRoute;
