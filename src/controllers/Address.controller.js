const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const AddressModel = require("../models/Address.model");

const getUserAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const addresses = await AddressModel.find({ user: userId });

    if (!addresses.length) {
      return res
        .status(404)
        .json(new ApiError(404, "No addresses found for this user"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, addresses, "Addresses retrieved successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error retrieving addresses"
        )
      );
  }
};

const createAddress = async (req, res) => {
  try {
    const { userId, billing, shipping, isDifferent, isActive } = req.body;

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    if (
      !billing ||
      !billing.firstName ||
      !billing.lastName ||
      !billing.address
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "Billing address details are incomplete"));
    }

    if (isActive) {
      await AddressModel.updateMany({ user: userId }, { isActive: false });
    }

    const newAddress = new AddressModel({
      user: userId,
      isDifferent: !!isDifferent,
      isActive: !!isActive,
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
    });

    if (isDifferent && shipping) {
      newAddress.shipping = {
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

    const savedAddress = await newAddress.save();

    return res
      .status(201)
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

const updateAddress = async (req, res) => {
  try {
    const { userId, addressId, billing, shipping, isDifferent, isActive } =
      req.body;

    const address = await AddressModel.findOne({
      _id: addressId,
      user: userId,
    });

    if (!address) {
      return res.status(404).json(new ApiError(404, "Address not found"));
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

    if (isActive) {
      await AddressModel.updateMany({ user: userId }, { isActive: false });
    }
    address.isActive = !!isActive;

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
