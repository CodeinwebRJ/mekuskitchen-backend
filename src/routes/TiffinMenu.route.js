const express = require("express");
const {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
} = require("../controllers/TiffinMenu.controller");
const upload = require("../middlewares/Multer.middleware");
const TiffinMenuRoute = express.Router();

TiffinMenuRoute.post("/", getAllTiffinMenu);
TiffinMenuRoute.post("/create", upload.array("image"), createTiffinMenu);
TiffinMenuRoute.put("/update/:id", editTiffinMenu);
TiffinMenuRoute.delete("/delete/:id", deleteTiffinMenu);

module.exports = TiffinMenuRoute;
