const mongoose = require("mongoose");

const CategorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    subCategories: [
      {
        name: {
          type: String,
          trim: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        subSubCategories: [
          {
            name: {
              type: String,
              trim: true,
            },
            isActive: {
              type: Boolean,
              default: true,
            },
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ name: 1 });

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
