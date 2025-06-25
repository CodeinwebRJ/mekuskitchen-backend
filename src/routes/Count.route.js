const express = require("express");
const {
  Counts,
  UploadImages,
  getCountryData,
} = require("../controllers/Count.controller");
const upload = require("../middlewares/Multer.middleware");
const CountRoute = express.Router();

// Get APIs
CountRoute.get("/:id", Counts);
CountRoute.post("/upload", upload.array("images"), UploadImages);
CountRoute.get("/get/country", getCountryData);

module.exports = CountRoute;
