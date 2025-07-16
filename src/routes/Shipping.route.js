const express = require("express");
const {
  CreateShipment,
  CancelShipping,
  Tracking,
  TimeInTransit,
} = require("../controllers/Shipping.controller");
const ShippingRoute = express.Router();

ShippingRoute.post("/create", CreateShipment);
ShippingRoute.get("/cancel/:shipmentId", CancelShipping);
ShippingRoute.post("/timeInTransit", TimeInTransit);
ShippingRoute.get("/track/:trackingNumber", Tracking);

module.exports = ShippingRoute;
