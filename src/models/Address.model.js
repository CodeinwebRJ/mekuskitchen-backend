const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  countryCode: {
    type: String,
  },
  city: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  provinceCode: {
    type: String,
    required: true,
  },
  phoneCode: {
    type: String,
  },
  postCode: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
    lowercase: true,
  },
});

const userAddressSchema = new Schema(
  {
    user: {
      type: String,
      required: true,
    },
    isDifferent: {
      type: Boolean,
    },
    isActive: {
      type: Boolean,
    },
    billing: addressSchema,
    shipping: addressSchema,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Address", userAddressSchema);
