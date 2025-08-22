const PincodeModel = require("../models/Pincode.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// Create Pincode
const CreatePincode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json(new ApiError(400, "Pincode is required"));
    }

    const existingPincode = await PincodeModel.findOne({ code: code.trim() });
    if (existingPincode) {
      return res
        .status(400)
        .json(new ApiError(400, "This pincode already exists"));
    }

    const pincode = await PincodeModel.create({
      code: code.trim(),
      isActive: true,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, pincode, "Pincode created successfully"));
  } catch (error) {
    console.error("Error creating pincode:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// Get All Pincodes
const getPincodeList = async (req, res) => {
  try {
    const { pincodeSearch } = req.query;
    const regex = new RegExp(pincodeSearch || "", "i");

    const pincodes = await PincodeModel.find({
      ...(pincodeSearch && { code: { $regex: regex } }),
    }).sort({ createdAt: -1 }); // newest first

    return res
      .status(200)
      .json(new ApiResponse(200, pincodes, "Pincodes retrieved successfully"));
  } catch (error) {
    console.error("Error fetching pincodes:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// Update Pincode
const UpdatePincode = async (req, res) => {
  try {
    const { pincodeId, code, isActive } = req.body;

    if (!pincodeId) {
      return res.status(400).json(new ApiError(400, "Pincode ID is required"));
    }

    const pincode = await PincodeModel.findById(pincodeId);
    if (!pincode) {
      return res.status(404).json(new ApiError(404, "Pincode not found"));
    }

    if (code) {
      const existingPincode = await PincodeModel.findOne({
        code: code.trim(),
        _id: { $ne: pincodeId },
      });
      if (existingPincode) {
        return res
          .status(400)
          .json(new ApiError(400, "This pincode already exists"));
      }
      pincode.code = code.trim();
    }

    if (isActive !== undefined) {
      pincode.isActive = Boolean(isActive);
    }

    const updatedPincode = await pincode.save();

    return res
      .status(200)
      .json(new ApiResponse(200, updatedPincode, "Pincode updated successfully"));
  } catch (error) {
    console.error("Error updating pincode:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// Delete Pincode
const DeletePincode = async (req, res) => {
  try {
    const { pincodeId } = req.body; // or req.params if using RESTful

    if (!pincodeId) {
      return res.status(400).json(new ApiError(400, "Pincode ID is required"));
    }

    const pincode = await PincodeModel.findById(pincodeId);
    if (!pincode) {
      return res.status(404).json(new ApiError(404, "Pincode not found"));
    }

    await PincodeModel.findByIdAndDelete(pincodeId);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Pincode deleted successfully"));
  } catch (error) {
    console.error("Error deleting pincode:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  CreatePincode,
  getPincodeList,
  UpdatePincode,
  DeletePincode,
};
