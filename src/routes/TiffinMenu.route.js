const express = require("express");
const {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
} = require("../controllers/TiffinMenu.controller");
const TiffinMenuRoute = express.Router();

TiffinMenuRoute.get("/", getAllTiffinMenu);
TiffinMenuRoute.post("/create", createTiffinMenu);
TiffinMenuRoute.put("/update/:id", editTiffinMenu);
TiffinMenuRoute.delete("/delete/:id", deleteTiffinMenu);

module.exports = TiffinMenuRoute;
