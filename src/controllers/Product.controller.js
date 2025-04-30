const { model } = require("mongoose");
const ProductModel = require("../models/Product.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const fs = require("fs");

const getAllProducts = async (req, res) => {
  try {
    const { page, limit, search, sortBy, category } = req.body;

    // Validate pagination params
    if (!page || !limit) {
      return res
        .status(400)
        .json(new ApiError(400, "Page and limit are required"));
    }

    const skip = (page - 1) * limit;

    // Build the query object
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" }; // Match 'name' based on search
    }
    if (category) {
      query.category = { $regex: category, $options: "i" }; // Match category if provided
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

    // Handle sorting logic
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

    // Add sorting stage to the pipeline
    if (Object.keys(sortStage).length > 0) {
      pipeline.push({ $sort: sortStage });
    }

    // Add pagination
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }, // Convert limit to an integer
      {
        $project: {
          __v: 0,
          "reviews._id": 0, // Exclude review IDs from the response
        },
      }
    );

    // Execute aggregation pipeline
    const products = await ProductModel.aggregate(pipeline).exec();

    // Get total product count
    const totalProducts = await ProductModel.countDocuments(query);

    if (!products || products.length === 0) {
      return res.status(404).json(new ApiError(404, "No products found"));
    }

    // Prepare response data with pagination info
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
      name,
      sku,
      price,
      currency,
      discountPrice,
      description,
      shortDescription,
      stock,
      sizes,
      dietaryPreference,
      category,
      subCategory,
      brand,
      features,
      specifications,
      weight,
      dimensions,
      productDetail,
      tags,
    } = req.body;

    // const imageFiles = req.files?.productImages || [];
    // const skuImageFiles = req.files?.skuImages || [];

    // console.log(imageFiles, skuImageFiles);

    // Validate required fields (based on schema)
    if (!name || !price || !currency) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Product name, price, and currency are required")
        );
    }

    // Validate price and discountPrice
    if (price < 0 || (discountPrice && discountPrice < 0)) {
      return res
        .status(400)
        .json(new ApiError(400, "Price and discountPrice cannot be negative"));
    }
    if (discountPrice && discountPrice >= price) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Discount price must be less than regular price")
        );
    }

    // Validate and process SKU
    let processedSkus = [];
    if (sku && Array.isArray(sku)) {
      const skuCodes = sku.map((item) => item.code);
      const existingProduct = await ProductModel.findOne({
        "sku.code": { $in: skuCodes },
      });
      if (existingProduct) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "A product with one of these SKU codes already exists"
            )
          );
      }

      // Process each SKU
      processedSkus = await Promise.all(
        sku.map(async (skuItem, index) => {
          const { details } = skuItem;

          let processedDetails = { ...details };
          if (details.images && Array.isArray(details.images)) {
            const imageIndices = details.images.filter(
              (i) => i >= 0 && i < skuImageFiles.length
            );
            if (imageIndices.length === 0 && details.images.length > 0) {
              throw new ApiError(
                400,
                `No valid images provided for SKU ${skuItem.code}`
              );
            }

            // Upload the images associated with the SKU
            const uploadPromises = imageIndices.map(async (i, idx) => {
              const result = await uploadToCloudinary(skuImageFiles[i].path);
              return {
                url: result.secure_url,
                isPrimary: idx === 0, // Set the first image as primary
              };
            });
            processedDetails.images = await Promise.all(uploadPromises);
          }

          return {
            code: skuItem.code,
            details: processedDetails,
          };
        })
      );
    }

    // Validate sizes
    if (sizes && Array.isArray(sizes)) {
      for (const size of sizes) {
        if (
          size.stock < 0 ||
          (size.priceAdjustment && typeof size.priceAdjustment !== "number")
        ) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid size stock or price adjustment"));
        }
      }
    }

    if (dimensions) {
      if (
        (dimensions.length && dimensions.length < 0) ||
        (dimensions.width && dimensions.width < 0) ||
        (dimensions.height && dimensions.height < 0)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Dimensions cannot be negative"));
      }
    }

    const newProduct = await ProductModel.create({
      name,
      sku: processedSkus,
      price,
      currency,
      discountPrice: discountPrice || null,
      description: description || null,
      shortDescription: shortDescription || null,
      // images: uploadedProductImages,
      stock: stock || 0,
      sizes: sizes || [],
      dietaryPreference: dietaryPreference || null,
      category: category || null,
      subCategory: subCategory || null,
      brand: brand || null,
      features: features || [],
      specifications: specifications || {},
      weight: weight || null,
      dimensions: dimensions || {},
      productDetail: productDetail || [],
      tags: tags || [],
      isActive: true,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newProduct, "Product created successfully"));
  } catch (error) {
    console.error("Error creating product:", error);
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Internal server error"
        )
      );
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid Product ID format"));
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
            category: { $in: ["tiffin"] },
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
      title,
      description,
      longDescription,
      keywords,
      features,
      ingredients,
      nutritionalInfo,
      allergens,
      sizes,
      dietaryPreference,
      cuisine,
      brand,
      specifications,
      weight,
      dimensions,
      shippingDetails,
      tags,
      Active,
    } = req.body;

    // Check if product ID is provided
    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const updateData = {};

    // Fields mapping from request body
    const fields = {
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
      ingredients,
      nutritionalInfo,
      allergens,
      sizes,
      dietaryPreference,
      cuisine,
      brand,
      specifications,
      weight,
      dimensions,
      shippingDetails,
      tags,
      Active,
    };

    // Update only the fields that are provided
    Object.keys(fields).forEach((key) => {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    });

    // Handle image updates if files are uploaded
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.path)
      ); // Assuming this function uploads to Cloudinary
      const uploadResults = await Promise.all(uploadPromises);
      const image_urls = uploadResults.map((result) => ({
        url: result.secure_url,
        altText: result.original_filename,
        isPrimary: false, // Set default isPrimary to false, can be updated later
      }));
      updateData.images = image_urls; // Update product with new images
    }

    // If no fields are provided for update, return error
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "No valid fields provided for update"));
    }

    // Update the product in the database
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

module.exports = {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
};
