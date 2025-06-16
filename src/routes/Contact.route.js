const express = require("express");
const {
  sendQuary,
  getAllQuarys,
} = require("../controllers/Contact.controller");
const ContactRoute = express.Router();

ContactRoute.post("/", sendQuary);
ContactRoute.get("/", getAllQuarys);

module.exports = ContactRoute;
