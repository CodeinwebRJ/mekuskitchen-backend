const mongoose = require("mongoose");

const categoryTaxSchema = new mongoose.Schema({
  category: { type: String, required: true },
  taxRate: { type: Number, required: true },
});

const taxSchema = new mongoose.Schema(
  {
    provinceCode: { type: String, required: true, unique: true },
    provinceName: { type: String, required: true },
    taxes: [categoryTaxSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("tax", taxSchema);
