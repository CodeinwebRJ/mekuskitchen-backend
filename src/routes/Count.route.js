const express = require("express");
const {
  Counts,
  UploadImages,
  getCountryData,
  getStateData,
  getCities,
} = require("../controllers/Count.controller");
const upload = require("../middlewares/Multer.middleware");
const CountRoute = express.Router();

// Get APIs
CountRoute.get("/:id", Counts);
CountRoute.post("/upload", upload.array("images"), UploadImages);
CountRoute.get("/get/country", getCountryData);
CountRoute.get("/get/getCities", getCities);

module.exports = CountRoute;
