const mongoose = require("mongoose");

const TiffinMenuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    day: {
      type: String,
      required: true,
    },
    items: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        weightUnit: {
          type: String,
        },
        weight: {
          type: String,
        },
        description: {
          type: String,
        },
      },
    ],
    date: {
      type: String,
    },
    endDate: {
      type: String,
    },
    subTotal: {
      type: String,
    },
    isCustomized: {
      type: Boolean,
    },
    image_url: [
      {
        url: {
          type: String,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAmount: {
      type: String,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    aboutItem: [
      {
        type: String,
      },
    ],
    Active: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

// Auto deactivate when saving
TiffinMenuSchema.pre("save", function (next) {
  if (this.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tiffinDate = new Date(this.date);
    tiffinDate.setHours(0, 0, 0, 0);

    if (tiffinDate < today) {
      this.Active = false;
    }
  }
  next();
});

module.exports = mongoose.model("TiffinMenu", TiffinMenuSchema);
