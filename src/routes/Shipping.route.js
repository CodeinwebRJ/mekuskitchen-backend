const express = require("express");
const {
  CreateShipment,
  CancelShipping,
  Tacking,
  CalculateRate,
} = require("../controllers/Shipping.controller");
const ShippingRoute = express.Router();

ShippingRoute.post("/create", CreateShipment);
ShippingRoute.get("/cancel/:shipmentId", CancelShipping);
ShippingRoute.post("/calculate", CalculateRate);
ShippingRoute.get("/track/:trackingNumber", Tacking);

module.exports = ShippingRoute;
