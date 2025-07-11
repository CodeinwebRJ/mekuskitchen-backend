const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const TiffinMenuModel = require("../models/TiffinMenu.model");
const ReviewModel = require("../models/Review.model");

const validDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const tryParseJson = (input, fieldName) => {
  try {
    return typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    throw new ApiError(400, `Invalid ${fieldName} JSON format`);
  }
};

const getAllTiffinMenu = async (req, res) => {
  try {
    const { Active, day, search } = req.body;
    const filter = {};

    if (Active !== undefined) filter.Active = Active;
    if (day?.trim()) filter.day = day.trim();

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ description: regex }, { "items.name": regex }];
    }

    let tiffins = await TiffinMenuModel.find(filter).sort({ createdAt: -1 });

    tiffins = tiffins.sort(
      (a, b) => validDays.indexOf(a.day) - validDays.indexOf(b.day)
    );

    const tiffinIds = tiffins.map((t) => t._id);
    const ratings = await ReviewModel.aggregate([
      { $match: { tiffinId: { $in: tiffinIds }, isTiffinReview: true } },
      {
        $group: {
          _id: "$tiffinId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const ratingMap = Object.fromEntries(
      ratings.map((r) => [r._id.toString(), r])
    );

    const tiffinsWithRating = tiffins.map((tiffin) => {
      const { averageRating = 0, totalReviews = 0 } =
        ratingMap[tiffin._id.toString()] || {};
      return {
        ...tiffin.toObject(),
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
      };
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tiffinsWithRating,
          "Tiffin menus fetched successfully"
        )
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
    let {
      name,
      day,
      items,
      date,
      endDate,
      subTotal,
      totalAmount,
      image_url,
      description,
      isCustomized,
      aboutItem,
    } = req.body;

    if (!day || !items) throw new ApiError(400, "Day and items are required");
    if (!validDays.includes(day))
      throw new ApiError(400, `Invalid day. Use: ${validDays.join(", ")}`);

    items = tryParseJson(items, "items");
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    image_url = tryParseJson(image_url || [], "image_url");
    aboutItem = tryParseJson(aboutItem || [], "aboutItem");

    const newTiffin = await TiffinMenuModel.create({
      name,
      day,
      items,
      date: date ? new Date(date) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      subTotal: subTotal ? String(subTotal) : "0",
      totalAmount: totalAmount ? String(totalAmount) : "0",
      image_url,
      description: description || "",
      isCustomized: isCustomized ?? false,
      aboutItem,
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
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

const editTiffinMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const tiffin = await TiffinMenuModel.findById(id);
    if (!tiffin) throw new ApiError(404, "Tiffin menu not found");

    let {
      name,
      day,
      items,
      date,
      endDate,
      subTotal,
      totalAmount,
      image_url,
      description,
      isCustomized,
      aboutItem,
      Active,
    } = req.body;

    if (items) {
      items = tryParseJson(items, "items");
      if (!Array.isArray(items))
        return res
          .status(400)
          .json(new ApiError(400, "Items must be an array"));
      tiffin.items = items;
    }

    if (image_url) {
      image_url = tryParseJson(image_url, "image_url");
      tiffin.image_url = image_url;
    }

    if (aboutItem) {
      aboutItem = tryParseJson(aboutItem, "aboutItem");
      if (!Array.isArray(aboutItem))
        return res
          .status(400)
          .json(new ApiError(400, "aboutItem must be an array"));
      tiffin.aboutItem = aboutItem;
    }

    if (date && isNaN(Date.parse(date)))
      return res.status(400).json(new ApiError(400, "Invalid date"));
    if (endDate && isNaN(Date.parse(endDate)))
      return res.status(400).json(new ApiError(400, "Invalid endDate"));

    Object.assign(tiffin, {
      name: name ?? tiffin.name,
      day: day || tiffin.day,
      date: date ? new Date(date) : tiffin.date,
      endDate: endDate ? new Date(endDate) : tiffin.endDate,
      subTotal: subTotal !== undefined ? String(subTotal) : tiffin.subTotal,
      totalAmount:
        totalAmount !== undefined ? String(totalAmount) : tiffin.totalAmount,
      description: description ?? tiffin.description,
      isCustomized: isCustomized ?? tiffin.isCustomized,
      Active: Active ?? tiffin.Active,
    });

    await tiffin.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tiffin.toObject(),
          "Tiffin menu updated successfully"
        )
      );
  } catch (error) {
    console.error("Error editing tiffin menu:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

const deleteTiffinMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TiffinMenuModel.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, "Tiffin menu not found");

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tiffin menu deleted successfully"));
  } catch (error) {
    console.error("Error deleting tiffin menu:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

const getTiffinById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Tiffin ID is required");

    const tiffin = await TiffinMenuModel.findById(id);
    if (!tiffin) throw new ApiError(404, "Tiffin not found");

    return res
      .status(200)
      .json(new ApiResponse(200, tiffin, "Tiffin fetched successfully"));
  } catch (error) {
    console.error("Error fetching tiffin:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

module.exports = {
  getAllTiffinMenu,
  createTiffinMenu,
  editTiffinMenu,
  deleteTiffinMenu,
  getTiffinById,
};
