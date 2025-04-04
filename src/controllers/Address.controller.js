const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const AddressModel = require("../models/Address.model");

const getUserAddress = async (req) => {
  try {
    const { userId } = req.params;
    const address = await AddressModel.findOne({ user: userId });
    if (!address) {
      return res
        .status(404)
        .json(new ApiError(404, "No address found for this user"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, address, "Address retrieved successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error retrieving address"
        )
      );
  }
};

const createAddress = async (req) => {
  try {
    const { userId, billing, shipping, isDifferent } = req.body;

    if (!userId) {
      return res.status(404).json(new ApiError(400, "User ID is required"));
    }

    if (
      !billing ||
      !billing.firstName ||
      !billing.lastName ||
      !billing.address
    ) {
      return res
        .status(404)
        .json(new ApiError(400, "Billing address details are incomplete"));
    }

    const existingAddress = await AddressModel.findOne({ userId });
    if (existingAddress) {
      return res
        .status(404)
        .json(new ApiError(400, "Address already exists for this user"));
    }

    const addressData = {
      userId,
      isDifferent: !!isDifferent,
      billing: {
        firstName: billing.firstName,
        lastName: billing.lastName,
        country: billing.country,
        state: billing.state,
        city: billing.city,
        address: billing.address,
        postcode: billing.postcode,
        phone: billing.phone,
        email: billing.email?.toLowerCase(),
      },
    };

    if (isDifferent && shipping) {
      addressData.shipping = {
        firstName: shipping.firstName || billing.firstName,
        lastName: shipping.lastName || billing.lastName,
        country: shipping.country || billing.country,
        state: shipping.state || billing.state,
        city: shipping.city || billing.city,
        address: shipping.address || billing.address,
        postcode: shipping.postcode || billing.postcode,
        phone: shipping.phone || billing.phone,
        email: shipping.email?.toLowerCase() || billing.email?.toLowerCase(),
      };
    }

    const newAddress = new AddressModel(addressData);
    const savedAddress = await newAddress.save();

    return res
      .status(200)
      .json(new ApiResponse(201, savedAddress, "Address created successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error creating address"
        )
      );
  }
};

const updateAddress = async (req) => {
  try {
    const { userId } = req.params;
    const { billing, shipping, isDifferent } = req.body;

    const address = await AddressModel.findOne({ user: userId });

    if (!address) {
      return res.status(500).json(new ApiError(404, "Address not found"));
    }

    if (billing) {
      address.billing = {
        ...address.billing,
        ...billing,
        email: billing.email?.toLowerCase(),
      };
    }

    if (typeof isDifferent !== "undefined") {
      address.isDifferent = !!isDifferent;

      if (isDifferent && shipping) {
        address.shipping = {
          ...address.shipping,
          ...shipping,
          email: shipping.email?.toLowerCase(),
        };
      } else if (!isDifferent) {
        address.shipping = undefined;
      }
    } else if (address.isDifferent && shipping) {
      address.shipping = {
        ...address.shipping,
        ...shipping,
        email: shipping.email?.toLowerCase(),
      };
    }

    const updatedAddress = await address.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedAddress, "Address updated successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error updating address"
        )
      );
  }
};

module.exports = {
  getUserAddress,
  createAddress,
  updateAddress,
};
