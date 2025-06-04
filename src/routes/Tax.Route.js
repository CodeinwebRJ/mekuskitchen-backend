const express = require("express");
const {
  getTaxRate,
  CreateTax,
  EditTax,
  DeleteTax,
} = require("../controllers/Tax.controller");
const TaxRoute = express.Router();

TaxRoute.get("/get", getTaxRate);
TaxRoute.post("/", CreateTax);
TaxRoute.put("/edit", EditTax);
TaxRoute.delete("/delete", DeleteTax);

module.exports = TaxRoute;
