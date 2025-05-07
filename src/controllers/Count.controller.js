const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const CartModel = require("../models/Cart.model");
const WishlistModel = require("../models/Wishlist.model");
const CategoryModel = require("../models/Category.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const fs = require("fs").promises;

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
    const { name, subCategories } = req.body;

    if (!name) {
      return res
        .status(400)
        .json(new ApiError(400, "Category name is required"));
    }

    if (subCategories) {
      if (!Array.isArray(subCategories)) {
        return res
          .status(400)
          .json(new ApiError(400, "subCategories must be an array"));
      }

      for (const subCat of subCategories) {
        if (!subCat.name || typeof subCat.name !== "string") {
          return res
            .status(400)
            .json(new ApiError(400, "Each subcategory must have a valid name"));
        }

        if (subCat.subSubCategories) {
          if (!Array.isArray(subCat.subSubCategories)) {
            return res
              .status(400)
              .json(new ApiError(400, "subSubCategories must be an array"));
          }

          for (const subSubCat of subCat.subSubCategories) {
            if (!subSubCat.name || typeof subSubCat.name !== "string") {
              return res
                .status(400)
                .json(
                  new ApiError(
                    400,
                    "Each sub-subcategory must have a valid name"
                  )
                );
            }
          }
        } else {
          subCat.subSubCategories = [];
        }
      }
    }

    const existingCategory = await CategoryModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingCategory) {
      return res
        .status(400)
        .json(new ApiError(400, "Category with this name already exists"));
    }

    // Create new category
    const categoryData = {
      name,
      isActive: true,
      subCategories: subCategories || [],
    };

    const savedCategory = await CategoryModel.create(categoryData);

    return res
      .status(201)
      .json(
        new ApiResponse(201, savedCategory, "Category created successfully")
      );
  } catch (error) {
    console.error("Error creating category:", error);
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json(new ApiError(400, messages.join(", ")));
    }
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const CreateSubCategory = async (req, res) => {
  try {
    const { categoryId, name } = req.body;

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
      (subCat) => String(subCat.name) === String(name)
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
    category.subCategories.push({ name });
    category.isActive = true;
    const updatedCategory = await category.save();

    return res
      .status(201)
      .json(
        new ApiResponse(201, updatedCategory, "SubCategory added successfully")
      );
  } catch (error) {
    console.error("Error creating subcategory:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const CreateSubSubCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId, name } = req.body;

    if (!categoryId || !subCategoryId || !name) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Category ID, SubCategory ID, and SubSubCategory name are required"
          )
        );
    }

    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      return res.status(404).json(new ApiError(404, "Category not found"));
    }

    const subCategory = category.subCategories.id(subCategoryId);
    if (!subCategory) {
      return res.status(404).json(new ApiError(404, "SubCategory not found"));
    }

    const existingSubSubCategory = subCategory.subSubCategories.find(
      (subSubCat) => subSubCat.name.toLowerCase() === name.toLowerCase()
    );
    if (existingSubSubCategory) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "SubSubCategory with this name already exists in this subcategory"
          )
        );
    }

    subCategory.subSubCategories.push({ name });
    const updatedCategory = await category.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          updatedCategory,
          "SubSubCategory added successfully"
        )
      );
  } catch (error) {
    console.error("Error creating sub-subcategory:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json(new ApiError(400, messages.join(", ")));
    }
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getCategoryList = async (req, res) => {
  try {
    const categories = await CategoryModel.find({ isActive: true })
      .select("name subCategories isActive createdAt updatedAt")
      .lean();

    if (!categories || categories.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No active categories found"));
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
    const categories = await CategoryModel.find({ isActive: true })
      .select("name subCategories")
      .lean();

    const subCategories = categories
      .filter((cat) => cat.subCategories && cat.subCategories.length > 0)
      .map((cat) => ({
        categoryName: cat.name,
        categoryId: cat._id,
        subCategories: cat.subCategories.map((subCat) => ({
          _id: subCat._id,
          name: subCat.name,
          subSubCategories: subCat.subSubCategories || [],
        })),
      }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subCategories,
          "Subcategories retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error in getSubCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getSubSubCategoryList = async (req, res) => {
  try {
    const categories = await CategoryModel.find({ isActive: true })
      .select("name subCategories")
      .lean();

    const subSubCategories = categories
      .filter((cat) => cat.subCategories && cat.subCategories.length > 0)
      .map((cat) => ({
        categoryName: cat.name,
        categoryId: cat._id,
        subCategories: cat.subCategories
          .filter(
            (subCat) =>
              subCat.subSubCategories && subCat.subSubCategories.length > 0
          )
          .map((subCat) => ({
            subCategoryName: subCat.name,
            subCategoryId: subCat._id,
            subSubCategories: subCat.subSubCategories.map((subSubCat) => ({
              _id: subSubCat._id,
              name: subSubCat.name,
            })),
          })),
      }))
      .filter((cat) => cat.subCategories.length > 0);

    if (!subSubCategories || subSubCategories.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No sub-subcategories found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subSubCategories,
          "Sub-subcategories retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error in getSubSubCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const UploadImages = async (req, res) => {
  try {
    console.log(req.files);
    const imageFiles = req.files || [];

    if (!imageFiles) {
      return res
        .status(400)
        .json(new ApiError(400, "At least one image file is required"));
    }

    const uploadPromises = imageFiles.map((file) =>
      uploadToCloudinary(file.path)
    );
    const uploadResults = await Promise.all(uploadPromises);

    const uploadedImages = uploadResults.map((result, index) => ({
      url: result.secure_url,
      isPrimary: index === 0,
    }));

    if (
      !uploadedImages.every(
        (img) => typeof img.url === "string" && img.url.trim() !== ""
      )
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "All uploaded images must have valid URLs"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { images: uploadedImages },
          "Images uploaded successfully"
        )
      );
  } catch (error) {
    console.error("Error uploading images:", error);
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Internal server error"
        )
      );
  } finally {
    if (req.files?.images && Array.isArray(req.files.images)) {
      await Promise.all(
        req.files.images.map(async (file) => {
          try {
            if (
              await fs
                .access(file.path)
                .then(() => true)
                .catch(() => false)
            ) {
              await fs.unlink(file.path);
            }
          } catch (error) {
            console.error(`Error removing file ${file.path}:`, error);
          }
        })
      );
    }
  }
};

module.exports = {
  Counts,
  getCategoryList,
  getSubCategoryList,
  CreateCategory,
  CreateSubCategory,
  CreateSubSubCategory,
  getSubSubCategoryList,
  UploadImages,
};
