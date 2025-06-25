const express = require("express");
const {
  getShippingCharges,
  CancelShipping,
  Tacking,
  CalculateRate,
} = require("../controllers/Shipping.controller");
const ShippingRoute = express.Router();

ShippingRoute.post("/create", getShippingCharges);
ShippingRoute.get("/cancel/:shipmentId", CancelShipping);
ShippingRoute.post("/calculate", CalculateRate);
ShippingRoute.get("/track/:trackingNumber", Tacking);

module.exports = ShippingRoute;
