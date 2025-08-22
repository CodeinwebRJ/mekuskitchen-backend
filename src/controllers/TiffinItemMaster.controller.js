const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const TiffinItemMasterModel = require("../models/TiffinItemMaster.model");

// ====== Controllers ======

// Get all Items
const getAllItems = async (req, res) => {
  try {
    const { status, search } = req.body;
    const filter = {};

    if (status !== undefined) filter.status = status;

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const items = await TiffinItemMasterModel.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, items, "Items fetched successfully"));
  } catch (error) {
    console.error("Error fetching items:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch items", error.message));
  }
};

// Create Item
const createItem = async (req, res) => {
  try {
    const { name, description, weight, price, weightUnit
 } = req.body;

    if (!name || !weight || !price || !weightUnit
) {
      return res
        .status(400)
        .json(new ApiError(400, "Name, weight, and price are required"));
    }

    const newItem = await TiffinItemMasterModel.create({
      name,
      description,
      weight,
      price,
     weightUnit,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newItem, "Item created successfully"));
  } catch (error) {
    console.error("Error creating item:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

// Edit Item
const editItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await TiffinItemMasterModel.findById(id);

    if (!item) return res.status(404).json(new ApiError(404, "Item not found"));

    const { name, description, weight, price, status, weightUnit
 } = req.body;

    Object.assign(item, {
      name: name ?? item.name,
      description: description ?? item.description,
      weight: weight ?? item.weight,
      price: price ?? item.price,
      status: status ?? item.status,
      weightUnit: weightUnit ?? item.weightUnit
,
    });

    await item.save();

    return res
      .status(200)
      .json(new ApiResponse(200, item, "Item updated successfully"));
  } catch (error) {
    console.error("Error editing item:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

// Delete Item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TiffinItemMasterModel.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json(new ApiError(404, "Item not found"));

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Item deleted successfully"));
  } catch (error) {
    console.error("Error deleting item:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

// Get Item by ID
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json(new ApiError(400, "Item ID is required"));

    const item = await TiffinItemMasterModel.findById(id);
    if (!item) return res.status(404).json(new ApiError(404, "Item not found"));

    return res
      .status(200)
      .json(new ApiResponse(200, item, "Item fetched successfully"));
  } catch (error) {
    console.error("Error fetching item:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};

// Change Item Status
const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json(new ApiError(400, "Status is required"));
    }

    const item = await TiffinItemMasterModel.findById(id);
    if (!item) {
      return res.status(404).json(new ApiError(404, "Item not found"));
    }

    item.status = status;
    await item.save();

    return res
      .status(200)
      .json(new ApiResponse(200, item, "Item status updated successfully"));
  } catch (error) {
    console.error("Error changing item status:", error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
};


module.exports = {
  getAllItems,
  createItem,
  editItem,
  deleteItem,
  getItemById,
  changeStatus,
};
