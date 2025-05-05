const CartModel = require("../models/Cart.model");
const WishlistModel = require("../models/Wishlist.model");
const CategoryModel = require("../models/Category.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const Counts = async (req, res) => {
  try {
    const { id } = req.params;

    const cart = await CartModel.findOne({ user: id });
    const wishlist = await WishlistModel.findOne({ userid: id });

    let CartItemCount = 0;

    if (cart.items.length > 0) {
      const productItemsCount =
        cart.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      CartItemCount = productItemsCount;
    } else {
      const tiffinItemsCount =
        cart.tiffins?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      CartItemCount = tiffinItemsCount;
    }

    const WishListItemCount = wishlist?.items?.length || 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          CartItemCount,
          WishListItemCount,
        },
        "Counts fetched successfully"
      )
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const CreateCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return res
        .status(400)
        .json(new ApiError(400, "Category name is required"));
    }

    const existingCategory = await CategoryModel.findOne({ name });
    if (existingCategory) {
      return res
        .status(400)
        .json(new ApiError(400, "Category with this name already exists"));
    }

    const savedCategory = await CategoryModel.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(200, savedCategory, "Category created successfully")
      );
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const CreateSubCategory = async (req, res) => {
  try {
    const { categoryId, name, isActive } = req.body;

    if (!categoryId || !name) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Category ID and SubCategory name are required")
        );
    }

    const category = await CategoryModel.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json(new ApiError(404, "Parent category not found"));
    }

    const existingSubCategory = category.subCategories.find(
      (subCat) => subCat.toLowerCase() === name.toLowerCase()
    );

    if (existingSubCategory) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "SubCategory with this name already exists in this category"
          )
        );
    }

    category.subCategories.push(name);
    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    const updatedCategory = await category.save();

    return res
      .status(201)
      .json(
        new ApiResponse(200, updatedCategory, "SubCategory added successfully")
      );
  } catch (error) {
    console.error("Error creating subcategory:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getCategoryList = async (req, res) => {
  try {
    const categories = await CategoryModel.find({});

    if (!categories || categories.length === 0) {
      return res.status(404).json(new ApiError(404, "No categories found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, categories, "Categories retrieved successfully")
      );
  } catch (error) {
    console.error("Error in getCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getSubCategoryList = async (req, res) => {
  try {
    const categories = await CategoryModel.find({}, "subCategories");

    const subCategories = categories
      .map((cat) => cat.subCategories)
      .flat()
      .filter((subCat) => subCat);

    if (!subCategories || subCategories.length === 0) {
      return res.status(404).json(new ApiError(404, "No subCategories found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subCategories,
          "SubCategories retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error in getSubCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

module.exports = {
  Counts,
  getCategoryList,
  getSubCategoryList,
  CreateCategory,
  CreateSubCategory,
};
