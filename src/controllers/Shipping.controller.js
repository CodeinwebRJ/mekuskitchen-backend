const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ShippingModel = require("../models/Shipping.model");
const getUPSToken = require("../utils/UPSToken");
const { default: axios } = require("axios");

const BASE_URL =
  process.env.UPS_ENV === "sandbox"
    ? "https://wwwcie.ups.com"
    : "https://onlinetools.ups.com";

const CreateShipment = async (req, res) => {
  try {
    const accessToken = await getUPSToken();
    const { shipTo, packages, RequestOption } = req.body;

    if (!shipTo || !packages || !Array.isArray(packages)) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Invalid input: shipTo and packages are required")
        );
    }

    const convertToKgs = (weight, unit) => {
      const w = parseFloat(weight);
      if (isNaN(w)) {
        return res
          .status(400)
          .json(new ApiError(`Invalid weight value: ${weight}`));
      }
      switch ((unit || "kgs").toLowerCase()) {
        case "g":
        case "gram":
          return w / 1000;
        case "lb":
        case "lbs":
        case "pound":
          return w * 0.453592;
        case "oz":
        case "ounce":
          return w * 0.0283495;
        case "kg":
        case "kgs":
        default:
          return w;
      }
    };

    const flattenedPackages = packages.flatMap((pkg) => {
      const quantity = parseInt(pkg.quantity, 10) || 1;
      if (isNaN(quantity) || quantity < 1) {
        return res
          .status(400)
          .json(
            new ApiError(`Invalid quantity for package: ${JSON.stringify(pkg)}`)
          );
      }
      const convertedWeight = convertToKgs(pkg.weight, pkg.unit);
      return Array.from({ length: quantity }).map(() => ({
        Packaging: { Code: "02" },
        PackageWeight: {
          UnitOfMeasurement: { Code: "KGS" },
          Weight: convertedWeight.toFixed(2),
        },
      }));
    });

    const response = await axios.post(
      `${BASE_URL}/api/shipments/v1/ship`,
      {
        ShipmentRequest: {
          Request: { RequestOption: RequestOption },
          Shipment: {
            Shipper: {
              Name: "info@eyemesto.com",
              Phone: { Number: "9057817567" },
              ShipperNumber: process.env.UPS_SHIPPER_NUMBER,
              Address: {
                AddressLine: ["277 Falshire Dr NE"],
                City: "Calgary",
                StateProvinceCode: "AB",
                PostalCode: "T3J1T9",
                CountryCode: "CA",
              },
            },
            ShipTo: {
              Name: shipTo.name,
              Phone: { Number: shipTo.phone },
              Address: {
                AddressLine: shipTo.address.addressLine,
                City: shipTo.address.city,
                StateProvinceCode: shipTo.address.stateOrProvince,
                PostalCode: shipTo.address.postalCode,
                CountryCode: shipTo.address.countryCode,
              },
            },
            PaymentInformation: {
              ShipmentCharge: {
                Type: "01",
                BillShipper: { AccountNumber: process.env.UPS_SHIPPER_NUMBER },
              },
            },
            Service: {
              Code: "11",
              Description: "Shipping Service",
            },
            Package: flattenedPackages,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          transId: `trans-${Date.now()}`,
          transactionSrc: "myApp",
        },
      }
    );

    const shipmentResult = response.data?.ShipmentResponse?.ShipmentResults;

    if (!shipmentResult) {
      return res
        .status(400)
        .json(new ApiError(400, "Failed to create shipment"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, response.data, "Shipment created successfully")
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
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
    res.status(500).json(new ApiError(500, "Failed to cancel shipment"));
  }
};

const Tracking = async (req, res) => {
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
    const token = await getUPSToken();
    const { shipFrom, shipTo, pickupDate, weight } = req.body;

    if (!shipFrom || !shipTo || !pickupDate) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Missing required fields: shipFrom, shipTo, and pickupDate are required"
          )
        );
    }

    const requestPayload = {
      TimeInTransitRequest: {
        Request: {
          RequestOption: "TNT",
        },
        ShipFrom: {
          Address: {
            City: shipFrom.city,
            StateProvinceCode: shipFrom.state,
            PostalCode: shipFrom.postalCode,
            CountryCode: shipFrom.countryCode,
          },
        },
        ShipTo: {
          Address: {
            City: shipTo.city,
            StateProvinceCode: shipTo.state,
            PostalCode: shipTo.postalCode,
            CountryCode: shipTo.countryCode,
          },
        },
        ShipmentWeight: {
          UnitOfMeasurement: {
            Code: "KGS",
          },
          Weight: weight.toString(),
        },
        PickupDate: pickupDate.replace(/-/g, ""),
      },
    };

    const response = await axios.post(
      `${BASE_URL}/rest/TimeInTransit`,
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          transId: `timeInTransit_${Date.now()}`,
          transactionSrc: "mekus",
        },
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          response.data,
          "Time-in-transit data fetched successfully"
        )
      );
  } catch (error) {
    console.error(error.response?.data || error.message);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Failed to retrieve time-in-transit info",
          error.response?.data || error.message
        )
      );
  }
};

module.exports = {
  CreateShipment,
  CancelShipping,
  Tracking,
  TimeInTransit,
};
