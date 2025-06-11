const express = require("express");
const {
  RegiesterAdmin,
  Adminlogin,
} = require("../controllers/AdminUser.controller");
const AdminUserRoute = express.Router();

AdminUserRoute.post("/login", Adminlogin);
AdminUserRoute.post("/register", RegiesterAdmin);

module.exports = AdminUserRoute;
