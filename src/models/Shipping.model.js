const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  name: { type: String },
  attentionName: { type: String },
  addressLine: [{ type: String }],
  city: { type: String },
  stateProvinceCode: { type: String },
  postalCode: { type: String },
  countryCode: { type: String },
});

const ShippingSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
    },
    shipper: AddressSchema,
    recipient: AddressSchema,
    service: {
      code: { type: String },
      description: { type: String },
    },
    packageDetails: {
      packagingType: { type: String },
      dimensions: {
        unit: { type: String },
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
      },
      weight: {
        unit: { type: String },
        value: { type: Number },
      },
    },
    trackingNumber: { type: String },
    shipmentId: { type: String },
    labelFormat: { type: String },
    labelImage: { type: String },
    rate: {
      currency: { type: String },
      amount: { type: Number },
    },
    status: {
      type: String,
      enum: ["Created", "Shipped", "Delivered", "Canceled"],
      default: "Created",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipment", ShippingSchema);
