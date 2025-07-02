const express = require("express");
const SubscriptionStatusesRoute = express.Router();
const appleClientMiddleware = require("../middlewares/et-world-AuthMiddleware.middleware");
const {
  getAllSubscriptionStatuses,
} = require("../controllers/et-world-SubscriptionStatuses.controller");

SubscriptionStatusesRoute.get(
  "/SubscriptionStatus/:transactionId",
  appleClientMiddleware,
  getAllSubscriptionStatuses
);

module.exports = SubscriptionStatusesRoute;
