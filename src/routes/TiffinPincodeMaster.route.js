const express = require("express");
const { getPincodeList, CreatePincode, UpdatePincode, DeletePincode, CheckPincode } = require("../controllers/TiffinPincodeMaster");

const PincodeMasterRoute = express.Router();

PincodeMasterRoute.get("/get/pincode",getPincodeList);
PincodeMasterRoute.post("/add/pincode",CreatePincode);
PincodeMasterRoute.patch("/update/pincode",UpdatePincode);
PincodeMasterRoute.delete("/delete/pincode",DeletePincode);
PincodeMasterRoute.get("/check/pincode/:code", CheckPincode);

module.exports = PincodeMasterRoute;