const mongoose = require("mongoose");

const SubCategorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Category = mongoose.model("SubCategory", SubCategorySchema);

module.exports = Category;
