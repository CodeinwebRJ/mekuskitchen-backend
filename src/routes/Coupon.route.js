const express = require("express");
const {
  getAllCoupons,
  CreateCoupons,
  EditCoupons,
  DeleteCoupons,
  ValidateCoupon,
} = require("../controllers/Coupon.controller");
const CouponRoute = express.Router();

CouponRoute.get("/admin", getAllCoupons);
CouponRoute.post("/admin", CreateCoupons);
CouponRoute.put("/admin", EditCoupons);
CouponRoute.get("/validate", ValidateCoupon);
CouponRoute.delete("/admin", DeleteCoupons);

module.exports = CouponRoute;
