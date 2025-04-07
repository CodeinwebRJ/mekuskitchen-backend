const express = require("express");
const {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
} = require("../controllers/Tiffin.controller");
const TiffinRoute = express.Router();

TiffinRoute.get("/", getAllTiffinMenu);
TiffinRoute.post("/create", createTiffinMenu);
TiffinRoute.put("/update/:id", editTiffinMenu);
TiffinRoute.delete("/delete", deleteTiffinMenu);

module.exports = TiffinRoute;
