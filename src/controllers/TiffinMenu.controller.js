const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const TiffinMenuModel = require("../models/TiffinMenu.model");

const getAllTiffinMenu = async (req, res) => {
  try {
    const { Active } = req.body;
    const filter = typeof Active === "boolean" ? { Active } : { Active: true };

    const tiffins = await TiffinMenuModel.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tiffins,
          `Tiffin menus fetched successfully (Active: ${filter.Active})`
        )
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const createTiffinMenu = async (req, res) => {
  try {
    const { day, items, date, subTotal, totalAmount } =
      req.body;

    if (!day || !items || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Day and items are required"));
    }

    const existingTiffin = await TiffinMenuModel.findOne({ day });

    if (existingTiffin) {
      return res
        .status(400)
        .json(new ApiError(400, `Tiffin menu for ${day} already exists`));
    }

    const newTiffin = await TiffinModel.create({
      day,
      items,
      date,
      subTotal,
      totalAmount,
      Active: true,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, newTiffin, "Tiffin menu created successfully")
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
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
      .json(
        new ApiResponse(200, deletedTiffin, "Tiffin menu deleted successfully")
      );
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
