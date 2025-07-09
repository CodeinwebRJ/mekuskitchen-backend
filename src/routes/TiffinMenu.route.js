const express = require("express");
const {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
  getTiffinById,
} = require("../controllers/TiffinMenu.controller");
const TiffinMenuRoute = express.Router();

TiffinMenuRoute.post("/", getAllTiffinMenu);
TiffinMenuRoute.post("/create", createTiffinMenu);
TiffinMenuRoute.get("/:id", getTiffinById);
TiffinMenuRoute.put("/update/:id", editTiffinMenu);
TiffinMenuRoute.delete("/delete/:id", deleteTiffinMenu);

module.exports = TiffinMenuRoute;
