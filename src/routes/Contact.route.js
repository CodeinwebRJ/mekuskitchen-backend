const express = require("express");
const { sendQuary } = require("../controllers/Contact.controller");
const ContactRoute = express.Router();

ContactRoute.post("/", sendQuary);

module.exports = ContactRoute;
