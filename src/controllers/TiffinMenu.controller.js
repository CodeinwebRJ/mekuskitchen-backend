const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const TiffinMenuModel = require("../models/TiffinMenu.model");

const getAllTiffinMenu = async (req, res) => {
  try {
    const { Active, day, search } = req.query;

    const filter = {};

    if (Active !== undefined) {
      filter.Active = Active === "true";
    }

    if (typeof day === "string" && day.trim() !== "") {
      filter.day = day;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { description: searchRegex },
        { "items.name": searchRegex },
      ];
    }

    const tiffins = await TiffinMenuModel.find(filter).sort({ createdAt: -1 });

    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const sortedTiffins = tiffins.sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, sortedTiffins, "Tiffin menus fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching tiffin menus:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch tiffin menus", error.message));
  }
};

const createTiffinMenu = async (req, res) => {
  try {
    const {
      day,
      items,
      date,
      endDate,
      subTotal,
      totalAmount,
      image_url,
      description,
      aboutItem,
    } = req.body;

    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    if (!day || !items || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Day and non-empty items array are required"));
    }

    if (!validDays.includes(day)) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Invalid day. Must be one of: ${validDays.join(", ")}`
          )
        );
    }

    if (
      (subTotal !== undefined && isNaN(Number(subTotal))) ||
      (totalAmount !== undefined && isNaN(Number(totalAmount)))
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

    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json(new ApiError(400, "Invalid endDate format"));
    }

    const existingTiffin = await TiffinMenuModel.findOne({ day });
    if (existingTiffin) {
      return res
        .status(409)
        .json(new ApiError(409, `Tiffin menu for ${day} already exists`));
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

    let parsedImages = [];
    if (image_url) {
      if (typeof image_url === "string") {
        try {
          parsedImages = JSON.parse(image_url);
        } catch (err) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid image_url JSON format"));
        }
      } else if (Array.isArray(image_url)) {
        parsedImages = image_url;
      }
    }

    const newTiffin = await TiffinMenuModel.create({
      day,
      items: parsedItems,
      date: date ? new Date(date) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      subTotal: subTotal ? String(subTotal) : "0",
      totalAmount: totalAmount ? String(totalAmount) : "0",
      image_url: parsedImages,
      description: description || "",
      aboutItem: aboutItem || [],
      category: "Tiffin",
      Active: true,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          newTiffin.toObject(),
          "Tiffin menu created successfully"
        )
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
    const { day, items, date, endDate, subTotal, totalAmount, Active } =
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
      existingTiffin.date = date;
    }

    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid endDate format"));
      }
      existingTiffin.endDate = endDate;
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
    console.error("Error deleting Tiffin menu:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to delete Tiffin menu", error.message));
  }
};

const getTiffinById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json(new ApiError(400, "Invalid tiffin ID"));
  }

  try {
    const tiffin = await TiffinMenuModel.findById(id);

    if (!tiffin) {
      return res.status(404).json(new ApiError(404, "Tiffin not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, tiffin, "Tiffin Fetch successfully"));
  } catch (error) {
    console.error("Error fetching tiffin by ID:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
  getTiffinById,
};
