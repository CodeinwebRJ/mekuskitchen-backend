const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const TiffinMenuModel = require("../models/TiffinMenu.model");
const { uploadToCloudinary } = require("../utils/Cloudinary.utils");

const getAllTiffinMenu = async (req, res) => {
  try {
    const { Active, day } = req.body;

    const filter = {};

    if (typeof day === "string" && day.trim() !== "") {
      filter.day = day;
    }

    if (typeof Active === "boolean") {
      filter.Active = Active;
    }

    const tiffins = await TiffinMenuModel.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tiffins,
          `Tiffin menus fetched successfully${
            filter.day ? ` for ${filter.day}` : ""
          }${filter.Active !== undefined ? ` (Active: ${filter.Active})` : ""}`
        )
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const createTiffinMenu = async (req, res) => {
  try {
    const { day, items, date, subTotal, totalAmount, description } =
      req.body;
    const imageFiles = req.files;

    if (!day || !items || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Day and non-empty items array are required"));
    }
    if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "At least one image file is required"));
    }

    if (
      (subTotal !== undefined && isNaN(subTotal)) ||
      (totalAmount !== undefined && isNaN(totalAmount))
    ) {
      return res
        .status(400)
        .json(
          new ApiError(400, "subTotal and totalAmount must be valid numbers")
        );
    }

    if (date && isNaN(Date.parse(date))) {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }

    const existingTiffin = await TiffinMenuModel.findOne({ day, date });
    if (existingTiffin) {
      return res
        .status(409)
        .json(
          new ApiError(409, `Tiffin menu for ${day} on ${date} already exists`)
        );
    }

    let parsedItems;
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (error) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Invalid items format: Unable to parse JSON")
          );
      }
    } else {
      parsedItems = items;
    }

    if (!Array.isArray(parsedItems)) {
      return res.status(400).json(new ApiError(400, "Items must be an array"));
    }

    const uploadPromises = imageFiles.map(async (file) => {
      try {
        const result = await uploadToCloudinary(file.path);
        return result.secure_url;
      } catch (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    });

    const image_url = await Promise.all(uploadPromises);

    if (!image_url.every((url) => typeof url === "string" && url.trim())) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid image URLs received from upload"));
    }

    const newTiffin = await TiffinMenuModel.create({
      day,
      items: parsedItems,
      date: date ? new Date(date) : undefined,
      subTotal: subTotal ? String(subTotal) : "0",
      totalAmount: totalAmount ? String(totalAmount) : "0",
      image_url,
      description,
      category: "Tiffin",
      Active: true,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, newTiffin, "Tiffin menu created successfully")
      );
  } catch (error) {
    console.error("Error creating tiffin menu:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Failed to create tiffin menu",
          error.message || error
        )
      );
  }
};

const editTiffinMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { day, items, date, subTotal, BookingEndDate, totalAmount, Active } =
      req.body;

    const existingTiffin = await TiffinMenuModel.findById(id);
    if (!existingTiffin) {
      return res.status(404).json(new ApiError(404, "Tiffin menu not found"));
    }

    if (day) existingTiffin.day = day;
    if (items) existingTiffin.items = items;
    if (date) existingTiffin.date = date;
    if (subTotal) existingTiffin.subTotal = subTotal;
    if (BookingEndDate) existingTiffin.BookingEndDate = BookingEndDate;
    if (totalAmount) existingTiffin.totalAmount = totalAmount;
    if (typeof Active === "boolean") existingTiffin.Active = Active;

    await existingTiffin.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, existingTiffin, "Tiffin menu updated successfully")
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const deleteTiffinMenu = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTiffin = await TiffinMenuModel.findByIdAndDelete(id);

    if (!deletedTiffin) {
      return res.status(404).json(new ApiError(404, "Tiffin menu not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tiffin menu deleted successfully"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};


module.exports = {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
};
