const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const ContactModel = require("../models/Contact.model");

const sendQuary = async (req, res) => {
  try {
    const { phone, name, phoneCode, email, message } = req.body;

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json(new ApiError(400, "Invalid email format"));
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json(new ApiError(400, "Phone number must be 10 digits"));
    }

    const contact = await ContactModel.create({
      name: name || "",
      email: email || "",
      phoneCode: phoneCode || null,
      phone: phone || null,
      message: message || "",
    });

    if (!contact) {
      return res
        .status(500)
        .json(new ApiError(500, "Failed to create contact query"));
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
    const { search } = req.query;

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, "i");

      if (!isNaN(search)) {
        filter = {
          phone: { $regex: searchRegex },
        };
      } else {
        filter = {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { message: searchRegex },
          ],
        };
      }
    }

    const contacts = await ContactModel.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          contacts,
          contacts.length > 0
            ? "Contact queries fetched successfully"
            : "No contact queries found"
        )
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = { sendQuary, getAllQuarys };
