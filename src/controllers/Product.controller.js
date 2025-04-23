const ProductModel = require("../models/Product.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  try {
    const { page, limit, search, sortBy, category } = req.body;

    if (!page || !limit) {
      return res
        .status(400)
        .json(new ApiError(400, "page and limit are required"));
    }
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.product_name = { $regex: search, $options: "i" };
    }
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    let pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          latestReview: { $max: "$reviews.createdAt" },
        },
      },
    ];

    // Handle sorting
    let sortStage = {};
    if (sortBy) {
      switch (sortBy.toLowerCase()) {
        case "high-to-low":
          sortStage = { price: -1 };
          break;
        case "low-to-high":
          sortStage = { price: 1 };
          break;
        case "sortbyaverageratings":
          sortStage = { averageRating: -1 };
          break;
        case "sortbylatest":
          sortStage = { createdAt: -1 };
          break;
        default:
          sortStage = { createdAt: -1 };
      }
    }

    // Add sorting to pipeline
    if (Object.keys(sortStage).length > 0) {
      pipeline.push({ $sort: sortStage });
    }

    // Add pagination
    pipeline.push(
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          __v: 0,
          "reviews._id": 0,
        },
      }
    );

    // Execute aggregation
    const products = await ProductModel.aggregate(pipeline).exec();

    // Get total count
    const totalProducts = await ProductModel.countDocuments(query);

    if (!products || products.length === 0) {
      return res.status(404).json(new ApiError(404, "No products found"));
    }

    // Prepare response data
    const resData = {
      success: true,
      total: totalProducts,
      page,
      pages: Math.ceil(totalProducts / limit),
      data: products,
    };

    res
      .status(200)
      .json(new ApiResponse(200, resData, "Fetched Data Successfully"));
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res
      .status(500)
      .json(new ApiError(500, "Server error while fetching products"));
  }
};

const CreateProduct = async (req, res) => {
  try {
    const {
      product_name,
      category,
      subCategory,
      price,
      stock,
      title,
      description,
      longDescription,
      keywords,
      features,
      attributes,
    } = req.body;

    console.log(req.body);

    // const imageFiles = req.files;

    if (!product_name || !category || !price || !description || !stock) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Product name, category, price, description, and stock are required"
          )
        );
    }

    // if (!imageFiles || imageFiles.length === 0) {
    //   return res
    //     .status(400)
    //     .json(new ApiError(400, "At least one image file is required"));
    // }

    const existingProduct = await ProductModel.findOne({
      product_name,
      category,
    });
    if (existingProduct) {
      return res
        .status(409)
        .json(
          new ApiError(
            409,
            "A product with this name already exists in this category"
          )
        );
    }

    // const uploadPromises = imageFiles.map((file) =>
    //   uploadToCloudinary(file.path)
    // );
    // const uploadResults = await Promise.all(uploadPromises);
    // const image_url = uploadResults.map((result) => result.secure_url);

    // if (
    //   !image_url.every((url) => typeof url === "string" && url.trim() !== "")
    // ) {
    //   return res
    //     .status(400)
    //     .json(new ApiError(400, "All uploaded images must have valid URLs"));
    // }

    const newProduct = await ProductModel.create({
      product_name,
      category,
      subCategory: subCategory || "",
      price: price,
      stock: stock,
      // image_url,
      title: title || "",
      description,
      Active: true,
      longDescription: longDescription || "",
      keywords: keywords ? keywords : [],
      features: features ? features : [],
      attributes: attributes ? attributes : [],
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newProduct, "Product created successfully"));
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  } finally {
    if (req.files && Array.isArray(req.files)) {
      await Promise.all(
        req.files.map(async (file) => {
          try {
            if (
              await fs
                .access(file.path)
                .then(() => true)
                .catch(() => false)
            ) {
              fs.unlink(file.path);
            }
          } catch (error) {
            console.error(`Error removing file ${file.path}:`, error);
          }
        })
      );
    }
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product retrieved successfully"));
  } catch (error) {
    console.error("Error in getProductById:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const RelatedProducts = async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json(new ApiError(400, "Category is required"));
    }

    if (category.toLowerCase() === "tiffin") {
      const tiffins = await TiffinModel.aggregate([
        {
          $match: {
            category: { $in: ["Tiffin"] },
            Active: true,
          },
        },
        { $sample: { size: 5 } },
      ]);

      if (tiffins.length === 0) {
        return res
          .status(404)
          .json(new ApiError(404, "No active tiffins found"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            tiffins,
            "Related tiffins retrieved successfully"
          )
        );
    }

    const products = await ProductModel.aggregate([
      { $match: { category: category } },
      { $sample: { size: 5 } },
    ]);

    if (products.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No products found in this category"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, products, "Random products retrieved successfully")
      );
  } catch (error) {
    console.error("Error in RelatedProducts:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal server error", error.message));
  }
};

// TODO : change Image Upload Flow add File formate.
const EditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      category,
      subCategory,
      price,
      stock,
      image_url,
      title,
      description,
      longDescription,
      keywords,
      features,
      attributes,
      Active,
    } = req.body;

    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const updateData = {};
    const fields = {
      product_name,
      category,
      subCategory,
      price,
      stock,
      image_url,
      title,
      description,
      longDescription,
      keywords,
      features,
      attributes,
      Active,
    };

    Object.keys(fields).forEach((key) => {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    });

    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) {
      return res
        .status(400)
        .json(new ApiError(400, "No valid fields provided for update"));
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
      );
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getCategoryList = async (req, res) => {
  try {
    const categories = await ProductModel.distinct("category");
    return res
      .status(200)
      .json(
        new ApiResponse(200, categories, "Category list fetched successfully")
      );
  } catch (error) {
    console.error("Error in getCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getSubCategoryList = async (req, res) => {
  try {
    const subCategory = await ProductModel.distinct("subCategory");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subCategory,
          "subCategory list fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error in getsubCategoryList:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

module.exports = {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  getCategoryList,
  getSubCategoryList,
};
