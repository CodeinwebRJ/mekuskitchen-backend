const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
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
  city: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  postcode: {
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

const Address = mongoose.model("Address", userAddressSchema);

module.exports = Address;
