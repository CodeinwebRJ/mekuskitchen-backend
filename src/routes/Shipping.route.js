const express = require("express");
const {
  CreateShipping,
  CancelShipping,
  Tacking,
  CalculateRate,
} = require("../controllers/Shipping.controller");
const ShippingRoute = express.Router();

ShippingRoute.post("/create", CreateShipping);
ShippingRoute.get("/cancel/:shipmentId", CancelShipping);
ShippingRoute.post("/calculate", CalculateRate);
ShippingRoute.get("/track/:trackingNumber", Tacking);
// ShippingRoute.post("/create" ,CreateShipping)
// ShippingRoute.post("/create" ,CreateShipping)
// ShippingRoute.post("/create" ,CreateShipping)

module.exports = ShippingRoute;
