const express = require("express");
const {
  getAllCoupons,
  CreateCoupons,
  EditCoupons,
  DeleteCoupons,
  ValidateCoupon,
  RemoveCoupon,
} = require("../controllers/Coupon.controller");
const CouponRoute = express.Router();

CouponRoute.get("/admin", getAllCoupons);
CouponRoute.post("/admin", CreateCoupons);
CouponRoute.put("/admin", EditCoupons);
CouponRoute.get("/validate", ValidateCoupon);
CouponRoute.delete("/admin", DeleteCoupons);
CouponRoute.post("/remove", RemoveCoupon);

module.exports = CouponRoute;
