const mongoose = require("mongoose");

const StateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
  },
  cities: [
    {
      type: String,
      required: true,
    },
  ],
});

const countrySchema = new mongoose.Schema({
  iso2: {
    type: String,
    required: true,
  },
  iso3: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  State: [
    {
      type: String,
    },
  ],
  phoneCode: {
    type: String,
  },
  states: [StateSchema],
});

module.exports = mongoose.model("Country", countrySchema);
