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

    // Define the order of days
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Sort tiffins by dayOrder
    const sortedTiffins = tiffins.sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          sortedTiffins,
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
    const { day, items, date, subTotal, totalAmount, description } = req.body;
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

    // Validate date format
    if (date && isNaN(Date.parse(date))) {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }

    // Check for existing tiffin menu with the same day
    const existingTiffin = await TiffinMenuModel.findOne({ day });
    if (existingTiffin) {
      return res
        .status(409)
        .json(new ApiError(409, `Tiffin menu for ${day} already exists`));
    }

    // Parse items if provided as a string
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

    // Validate items is an array
    if (!Array.isArray(parsedItems)) {
      return res.status(400).json(new ApiError(400, "Items must be an array"));
    }

    // Upload images to Cloudinary
    const uploadPromises = imageFiles.map(async (file) => {
      try {
        const result = await uploadToCloudinary(file.path);
        return result.secure_url;
      } catch (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    // Validate uploaded URLs
    if (!uploadedUrls.every((url) => typeof url === "string" && url.trim())) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid image URLs received from upload"));
    }

    // Format images for schema
    const image_url = uploadedUrls.map((url, index) => ({
      url,
      isPrimary: index === 0,
    }));

    // Create new tiffin menu
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

    if (items) {
      let parsedItems = items;
      if (typeof items === "string") {
        try {
          parsedItems = JSON.parse(items);
        } catch (err) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid items JSON format"));
        }
      }
      if (!Array.isArray(parsedItems)) {
        return res
          .status(400)
          .json(new ApiError(400, "Items must be an array"));
      }
      existingTiffin.items = parsedItems;
    }

    if (date) {
      if (isNaN(Date.parse(date))) {
        return res.status(400).json(new ApiError(400, "Invalid date format"));
      }
      existingTiffin.date = new Date(date);
    }

    if (subTotal !== undefined) {
      if (isNaN(subTotal)) {
        return res
          .status(400)
          .json(new ApiError(400, "subTotal must be a valid number"));
      }
      existingTiffin.subTotal = String(subTotal);
    }

    if (totalAmount !== undefined) {
      if (isNaN(totalAmount)) {
        return res
          .status(400)
          .json(new ApiError(400, "totalAmount must be a valid number"));
      }
      existingTiffin.totalAmount = String(totalAmount);
    }

    if (BookingEndDate) {
      if (isNaN(Date.parse(BookingEndDate))) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid BookingEndDate format"));
      }
      existingTiffin.BookingEndDate = new Date(BookingEndDate);
    }

    if (typeof Active === "boolean") {
      existingTiffin.Active = Active;
    }

    await existingTiffin.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, existingTiffin, "Tiffin menu updated successfully")
      );
  } catch (error) {
    console.error("Error updating tiffin menu:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to update tiffin menu", error.message));
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
