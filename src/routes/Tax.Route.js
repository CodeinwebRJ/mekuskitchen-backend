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
TaxRoute.put("/edit/:provinceCode", EditTax);
TaxRoute.delete("/delete/:provinceCode", DeleteTax);

module.exports = TaxRoute;
