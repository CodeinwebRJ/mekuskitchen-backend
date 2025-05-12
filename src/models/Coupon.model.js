const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  name: { type: String },
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  startAt: { type: Date },
  expiresAt: { type: Date },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  image: { type: String },
  termsAndConditions: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  category: [{ type: String }], 
  subCategory: [{ type: String }], 
  subSubCategory: [{ type: String }], 
});

module.exports = mongoose.model("Coupon", couponSchema);
