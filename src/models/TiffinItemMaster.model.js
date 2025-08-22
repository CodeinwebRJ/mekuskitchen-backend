const mongoose = require("mongoose");

const ItemMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    weight: {
      type: String, 
      required: true,
    },
    weightUnit: {
      type: String, 
      require: true,
      enum: ["OZ", "G", "KG", "ML", "L", "PIECE", "BOWL", "PLATE", "BOX"]
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: Boolean,
      default: true, 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ItemMaster", ItemMasterSchema);
