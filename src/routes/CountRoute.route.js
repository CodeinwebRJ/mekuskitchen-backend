const express = require("express");
const { Counts } = require("../controllers/Count.controller");
const CountRoute = express.Router();

CountRoute.get("/:id", Counts);

module.exports = CountRoute;
