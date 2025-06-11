const express = require("express");
const {
  RegiesterAdmin,
  AdminLogin,
  SendOtp,
  ForgotPassword,
  UpdateProfile,
} = require("../controllers/AdminUser.controller");
const AdminUserRoute = express.Router();

AdminUserRoute.post("/login", AdminLogin);
AdminUserRoute.post("/register", RegiesterAdmin);
AdminUserRoute.get("/otp/:email", SendOtp);
AdminUserRoute.post("/forgot", ForgotPassword);
AdminUserRoute.patch("/update", UpdateProfile);

module.exports = AdminUserRoute;
