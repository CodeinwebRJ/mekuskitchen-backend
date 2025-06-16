const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ContactModel = require("../models/Contact.model");

const sendQuary = async (req, res) => {
  try {
    const { userId, phone, name, email, message } = req.body;

    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      throw new ApiError(400, "Phone number must be 10 digits");
    }

    const contact = await ContactModel.create({
      user: userId,
      name: name || "",
      email: email || "",
      phone: phone || null,
      message: message || "",
    });

    if (!contact) {
      throw new ApiError(500, "Failed to create contact query");
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, contact, "Contact query created successfully")
      );
  } catch (error) {
    console.error("Error in sendQuary:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getAllQuarys = async (req, res) => {
  try {
    const contacts = await ContactModel.find().sort({ createdAt: -1 });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          contacts,
          "All contact queries fetched successfully"
        )
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = { sendQuary, getAllQuarys };
