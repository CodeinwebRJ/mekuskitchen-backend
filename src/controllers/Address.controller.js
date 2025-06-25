const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const AddressModel = require("../models/Address.model");
const axios = require("axios");

const getUserAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const addresses = await AddressModel.find({ user: userId });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          addresses,
          addresses.length
            ? "Addresses retrieved successfully"
            : "No addresses found for this user"
        )
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
    const { userId, billing, shipping, isDifferent } = req.body;

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    if (!billing.name || !billing.address || !billing.provinceCode) {
      return res
        .status(400)
        .json(new ApiError(400, "Billing address details are incomplete"));
    }

    const addressCount = await AddressModel.countDocuments({ user: userId });
    if (addressCount >= 3) {
      return res
        .status(400)
        .json(new ApiError(400, "You can only create up to 3 addresses"));
    }

    if (userId) {
      await AddressModel.updateMany({ user: userId }, { isActive: false });
    }

    const newAddress = new AddressModel({
      user: userId,
      isDifferent: !!isDifferent,
      isActive: true,
      billing: {
        name: billing.name,
        country: billing.country,
        state: billing.state,
        city: billing.city,
        address: billing.address,
        postCode: billing.postCode,
        provinceCode: billing.provinceCode,
        countryCode: billing.countryCode,
        phoneCode: billing.phoneCode,
        phone: billing.phone,
        email: billing.email?.toLowerCase(),
      },
    });

    if (isDifferent && shipping) {
      newAddress.shipping = {
        name: shipping.name || billing.name,
        country: shipping.country || billing.country,
        state: shipping.state || billing.state,
        city: shipping.city || billing.city,
        address: shipping.address || billing.address,
        postCode: shipping.postCode || billing.postCode,
        countryCode: shipping.countryCode || billing.countryCode,
        provinceCode: shipping.provinceCode || billing.provinceCode,
        phoneCode: shipping.phoneCode || billing.phoneCode,
        phone: shipping.phone || billing.phone,
        email: shipping.email?.toLowerCase() || billing.email?.toLowerCase(),
      };
    }

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

const updateAddress = async (req, res) => {
  try {
    const { userId, addressId, billing, shipping, isDifferent, isActive } =
      req.body;

    if (!userId || !addressId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Address ID are required"));
    }

    const address = await AddressModel.findOne({
      _id: addressId,
      user: userId,
    });

    if (!address) {
      return res.status(404).json(new ApiError(404, "Address not found"));
    }

    if (billing) {
      const {
        name,
        country,
        state,
        city,
        address: streetAddress,
        postCode, // Keep this as postCode to match the request body
        phoneCode,
        phone,
        email,
        provinceCode,
        countryCode,
      } = billing;

      if (!name || !streetAddress || !provinceCode) {
        return res
          .status(400)
          .json(new ApiError(400, "Incomplete billing data"));
      }

      address.billing = {
        name,
        country,
        state,
        city,
        address: streetAddress,
        postCode,
        phoneCode,
        phone,
        email: email?.toLowerCase() || "",
        provinceCode,
        countryCode,
      };
    }

    address.isDifferent = !!isDifferent;

    if (isDifferent) {
      address.shipping = {
        name: shipping?.name || billing?.name || address.billing?.name,
        country:
          shipping?.country || billing?.country || address.billing?.country,
        state: shipping?.state || billing?.state || address.billing?.state,
        city: shipping?.city || billing?.city || address.billing?.city,
        address:
          shipping?.address || billing?.address || address.billing?.address,
        postCode:
          shipping?.postCode || billing?.postCode || address.billing?.postCode,
        phoneCode:
          shipping?.phoneCode ||
          billing?.phoneCode ||
          address.billing?.phoneCode,
        phone: shipping?.phone || billing?.phone || address.billing?.phone,
        email:
          shipping?.email?.toLowerCase() ||
          billing?.email?.toLowerCase() ||
          address.billing?.email,
        provinceCode:
          shipping?.provinceCode ||
          billing?.provinceCode ||
          address.billing?.provinceCode,
        countryCode:
          shipping?.countryCode ||
          billing?.countryCode ||
          address.billing?.countryCode,
      };
    } else {
      address.shipping = undefined;
    }

    if (typeof isActive === "boolean") {
      if (isActive) {
        await AddressModel.updateMany({ user: userId }, { isActive: false });
      }
      address.isActive = isActive;
    }

    const updatedAddress = await address.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedAddress, "Address updated successfully")
      );
  } catch (error) {
    console.error("Error updating address:", error);
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

const deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    if (!userId || !addressId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Address ID are required"));
    }

    const address = await AddressModel.findOne({
      _id: addressId,
      user: userId,
    });

    if (!address) {
      return res
        .status(404)
        .json(new ApiError(404, "Address not found or already deleted"));
    }

    const wasActive = address.isActive;

    await AddressModel.deleteOne({ _id: addressId });

    if (wasActive) {
      const firstAddress = await AddressModel.findOne({ user: userId }).sort({
        createdAt: 1,
      });

      if (firstAddress) {
        firstAddress.isActive = true;
        await firstAddress.save();
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Address deleted successfully"));
  } catch (error) {
    console.error("Error deleting address:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error deleting address"
        )
      );
  }
};

const ActiveAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    if (!userId || !addressId) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Address ID are required"));
    }

    await AddressModel.updateMany({ user: userId }, { isActive: false });

    const activeAddress = await AddressModel.findOneAndUpdate(
      { _id: addressId, user: userId },
      { isActive: true },
      { new: true }
    );

    if (!activeAddress) {
      return res.status(404).json(new ApiError(404, "Address not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, activeAddress, "Address activated successfully")
      );
  } catch (error) {
    console.error("Error activating address:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong while activating address"));
  }
};

const SuggestAddress = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({ error: "Missing 'search' parameter" });
    }

    const response = await axios.get(
      "https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws",
      {
        params: {
          Key: process.env.CANADA_ADDRESS_KEY,
          SearchTerm: search,
          Country: "CAN",
          LanguagePreference: "EN",
        },
      }
    );

    return res.json(response.data.Items);
  } catch (error) {
    console.error("Canada Post SuggestAddress Error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch address suggestions" });
  }
};

const RetrieveAddressDetails = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing 'id' parameter" });
    }

    const response = await axios.get(
      "https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.10/json3.ws",
      {
        params: {
          Key: process.env.CANADA_ADDRESS_KEY,
          Id: id, // Correct parameter
        },
      }
    );

    return res.json(response.data.Items);
  } catch (error) {
    console.error("Canada Post RetrieveAddressDetails Error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch full address details" });
  }
};

module.exports = {
  getUserAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  ActiveAddress,
  SuggestAddress,
  RetrieveAddressDetails,
};
