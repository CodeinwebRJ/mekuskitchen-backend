const ProductModel = require("../models/Product.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  try {
    console.log(req.body);
    const { page, limit, search, sortBy, category } = req.body;

    if (!page || !limit) {
      return res
        .status(400)
        .json(new ApiError(400, "page and limit are required"));
    }
    const skip = (page - 1) * limit;

    // Build query object
    let query = {};
    if (search) {
      query.product_name = { $regex: search, $options: "i" };
    }
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    // Base aggregation pipeline
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
    const { product_name, category, price, description, stock, subCategory } =
      req.body;
    const imageFiles = req.files;

    // Validate required fields
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

    // Check if image files are provided
    if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "At least one image file is required"));
    }

    // Upload images to Cloudinary
    const uploadPromises = imageFiles.map((file) =>
      uploadToCloudinary(file.path)
    );
    const uploadResults = await Promise.all(uploadPromises);
    const image_url = uploadResults.map((result) => result.secure_url);

    // Validate image URLs
    if (
      !image_url.every((url) => typeof url === "string" && url.trim() !== "")
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "All uploaded images must have valid URLs"));
    }

    const existingProduct = await ProductModel.findOne({ product_name });
    if (existingProduct) {
      return res
        .status(409)
        .json(new ApiError(409, "A product with this name already exists"));
    }

    // Create new product
    const newProduct = await ProductModel.create({
      product_name,
      category,
      price: Number(price),
      image_url,
      description,
      subCategory: subCategory,
      stock: Number(stock),
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newProduct, "Product Created Successfully"));
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
    const { id } = req.query;

    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid product ID format"));
    }

    // Find product by ID
    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Product retrieved successfully"));
  } catch (error) {
    console.error("Error in getProductById:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

module.exports = { getAllProducts, CreateProduct, getProductById };
