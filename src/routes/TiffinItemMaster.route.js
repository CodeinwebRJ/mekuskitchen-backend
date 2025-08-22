const express = require("express");
const {
  getAllItems,
  createItem,
  editItem,
  deleteItem,
  getItemById,
  changeStatus,
} = require("../controllers/TiffinItemMaster.controller"); // make sure controller path is correct

const TiffinItemMasterRoute = express.Router();

TiffinItemMasterRoute.post("/", getAllItems);
TiffinItemMasterRoute.post("/create", createItem);
TiffinItemMasterRoute.get("/:id", getItemById);
TiffinItemMasterRoute.put("/update/:id", editItem);
TiffinItemMasterRoute.delete("/delete/:id", deleteItem);
TiffinItemMasterRoute.patch("/change-status/:id", changeStatus);

module.exports = TiffinItemMasterRoute;
