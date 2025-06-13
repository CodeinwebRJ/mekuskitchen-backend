const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ShippingModel = require("../models/Shipping.model");

const BASE_URL = process.env.UPS_BASE_URl;

const CreateShipping = async (req, res) => {
  try {
    const token = await getUPSToken();
    const {
      shipper,
      recipient,
      packageDetails,
      serviceCode = "03",
      orderId,
    } = req.body;

    const shipmentPayload = {
      ShipmentRequest: {
        Shipment: {
          Shipper: {
            Name: shipper.name,
            AttentionName: shipper.attentionName,
            ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
            Address: shipper.address,
          },
          ShipTo: {
            Name: recipient.name,
            Address: recipient.address,
          },
          Service: {
            Code: serviceCode,
            Description: "UPS Ground",
          },
          Package: [
            {
              Packaging: { Code: packageDetails.packagingType || "02" },
              Dimensions: {
                UnitOfMeasurement: { Code: packageDetails.unit || "IN" },
                Length: packageDetails.length,
                Width: packageDetails.width,
                Height: packageDetails.height,
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: packageDetails.weightUnit || "LBS" },
                Weight: packageDetails.weight,
              },
            },
          ],
        },
        LabelSpecification: {
          LabelImageFormat: { Code: "GIF" },
        },
      },
    };

    const upsResponse = await axios.post(
      `${BASE_URL}/ship/v1/shipments`,
      shipmentPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          transId: `order_${Date.now()}`,
          transactionSrc: "mekus",
        },
      }
    );

    const shipmentResult = upsResponse.data?.ShipmentResponse?.ShipmentResults;
    const trackingNumber = shipmentResult?.ShipmentIdentificationNumber;
    const labelImage =
      shipmentResult?.PackageResults?.ShippingLabel?.GraphicImage;

    const shipping = new ShippingModel({
      orderId,
      shipper,
      recipient,
      trackingNumber,
      shipmentId: trackingNumber,
      service: {
        code: serviceCode,
        description: "UPS Ground",
      },
      packageDetails,
      labelFormat: "GIF",
      labelImage,
    });

    await shipping.save();

    return res
      .status(200)
      .json(new ApiResponse(200, shipping, "Shipment created successfully"));
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Internal Server Error",
          err.response?.data || err.message
        )
      );
  }
};

const CancelShipping = async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const token = await getUPSToken();

    await axios.post(
      `${BASE_URL}/ship/v1/shipments/cancel`,
      {
        ShipmentIdentificationNumber: shipmentId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          transId: `cancel_${Date.now()}`,
          transactionSrc: "mekus",
        },
      }
    );

    const shipment = await ShippingModel.findOneAndUpdate(
      { shipmentId },
      { status: "Canceled" },
      { new: true }
    );

    if (!shipment) {
      return res.status(404).json(new ApiError(404, "Shipment not found"));
    }

    res
      .status(200)
      .json(new ApiResponse(200, shipment, "Shipment canceled successfully"));
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to cancel shipment",
      details: error.response?.data || error.message,
    });
  }
};

const CalculateRate = async (req, res) => {
  try {
    const token = await getUPSToken();
    const { shipper, recipient, packageDetails, serviceCode = "03" } = req.body;

    const ratePayload = {
      RateRequest: {
        Request: {
          RequestOption: "Rate",
        },
        Shipment: {
          Shipper: {
            Address: {
              AddressLine: shipper.addressLine,
              City: shipper.city,
              StateProvinceCode: shipper.stateProvinceCode,
              PostalCode: shipper.postalCode,
              CountryCode: shipper.countryCode,
            },
          },
          ShipTo: {
            Address: {
              AddressLine: recipient.addressLine,
              City: recipient.city,
              StateProvinceCode: recipient.stateProvinceCode,
              PostalCode: recipient.postalCode,
              CountryCode: recipient.countryCode,
            },
          },
          Service: {
            Code: serviceCode,
          },
          Package: [
            {
              PackagingType: {
                Code: packageDetails.packagingType || "02",
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: packageDetails.dimensions.unit || "IN",
                },
                Length: packageDetails.dimensions.length,
                Width: packageDetails.dimensions.width,
                Height: packageDetails.dimensions.height,
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: packageDetails.weight.unit || "LBS",
                },
                Weight: packageDetails.weight.value,
              },
            },
          ],
        },
      },
    };

    const response = await axios.post(
      `${BASE_URL}/rating/v1/shops`,
      ratePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          transId: `rate_${Date.now()}`,
          transactionSrc: "mekus",
        },
      }
    );

    res
      .status(200)
      .json(
        new ApiResponse(200, response.data, "Rates retrieved successfully")
      );
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const Tacking = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res
        .status(400)
        .json(new ApiError(400, "Tracking number is required"));
    }

    const token = await getUPSToken();

    const response = await axios.get(
      `${BASE_URL}/api/track/v1/details/${trackingNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          transId: `track_${Date.now()}`,
          transactionSrc: "mekus",
        },
      }
    );

    const trackingData = response.data;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          trackingData,
          "Tracking details fetched successfully"
        )
      );
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Failed to fetch tracking info",
          err.response?.data || err.message
        )
      );
  }
};

const TimeInTransit = async (req, res) => {
  try {
    const {} = req.body;
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  CreateShipping,
  CancelShipping,
  CalculateRate,
  Tacking,
  TimeInTransit,
};
