const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const ProductModel = require("../models/Product.model");
const TiffinModel = require("../models/TiffinMenu.model");
const { uploadToCloudinary } = require("../utils/Cloudinary.utils");
const fs = require("fs");
const mongoose = require("mongoose");

const safeParseJSON = (data, fieldName) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throw new ApiError(400, `Invalid JSON for ${fieldName}`);
  }
};

const getAllProducts = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      sortBy,
      category,
      subCategory,
      ProductCategory,
      brand,
      ratings,
      price,
    } = req.body;

    if (!page || !limit) {
      return res
        .status(400)
        .json(new ApiError(400, "Page and limit are required"));
    }

    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: "i" } },
        { description: { $regex: sanitizedSearch, $options: "i" } },
        { brand: { $regex: sanitizedSearch, $options: "i" } },
        { shortDescription: { $regex: sanitizedSearch, $options: "i" } },
      ];
    }

    const sanitizeArray = (arr) =>
      arr.filter((item) => typeof item === "string" && item.trim() !== "");

    if (Array.isArray(category)) {
      const filtered = sanitizeArray(category);
      if (filtered.length > 0) {
        query.category = { $in: filtered };
      }
    }

    if (Array.isArray(subCategory)) {
      const filtered = sanitizeArray(subCategory);
      if (filtered.length > 0) {
        query.subCategory = { $in: filtered };
      }
    }

    if (Array.isArray(ProductCategory)) {
      const filtered = sanitizeArray(ProductCategory);
      if (filtered.length > 0) {
        query.ProductCategory = { $in: filtered };
      }
    }

    if (Array.isArray(brand)) {
      const filtered = sanitizeArray(brand);
      if (filtered.length > 0) {
        query.brand = { $in: filtered };
      }
    }

    // Add price filter
    if (Array.isArray(price) && price.length === 2) {
      const [minPrice, maxPrice] = price.map((p) => parseFloat(p));
      if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice <= maxPrice) {
        query.price = { $gte: minPrice, $lte: maxPrice };
      } else {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid price range provided"));
      }
    } else if (price) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Price must be an array with min and max values")
        );
    }

    let pipeline = [
      { $match: query },
      {
        $addFields: {
          productIdStr: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "productIdStr",
          foreignField: "product_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] },
              then: { $avg: "$reviews.rating" },
              else: 0,
            },
          },
        },
      },
    ];

    if (Array.isArray(ratings) && ratings.length > 0) {
      const validRatings = ratings
        .map((rating) => parseFloat(rating))
        .filter((rating) => !isNaN(rating) && rating >= 0 && rating <= 5);
      if (validRatings.length > 0) {
        pipeline.push({
          $match: {
            averageRating: { $in: validRatings },
          },
        });
      }
    }

    pipeline.push({
      $project: {
        productIdStr: 0,
        __v: 0,
        reviews: 0,
      },
    });

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

    if (Object.keys(sortStage).length > 0) {
      pipeline.push({ $sort: sortStage });
    }

    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    const products = await ProductModel.aggregate(pipeline).exec();
    const totalProducts = await ProductModel.countDocuments(query);

    const resData = {
      success: true,
      total: totalProducts,
      page,
      pages: Math.ceil(totalProducts / limit),
      data: products || [],
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
      sellingPrice,
      description,
      shortDescription,
      stock,
      sizes,
      discount,
      dietaryPreference,
      category,
      subCategory,
      subsubCategory,
      brand,
      features,
      specifications,
      weight,
      weightUnit,
      dimensions,
      productDetail,
      tags,
      images,
      SKUName,
      currency,
    } = req.body;

    const existingName = await ProductModel.findOne({ name: name.trim() });
    if (existingName) {
      return res
        .status(400)
        .json(new ApiError(409, "A product with this name already exists"));
    }

    if (!name || !price || !currency) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Product name, price, sku and currency are required"
          )
        );
    }
    if (price < 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Price and sellingPrice cannot be negative"));
    }

    let skuArray = safeParseJSON(sku, "sku");

    if (!Array.isArray(skuArray)) {
      return res.status(400).json(new ApiError(400, "SKU must be an array"));
    }

    const skuCodes = skuArray.map((item) => item.SKUname);
    const existingProduct = await ProductModel.findOne({
      "sku.SKUName": { $in: skuCodes },
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

    const processedSkus = skuArray.map((skuItem) => ({
      details: skuItem || {},
    }));

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

    const productDetailArray = safeParseJSON(productDetail, "productDetail");
    const validatedProductDetail = productDetailArray?.map((detail) => {
      return { ...detail };
    });

    const newProduct = await ProductModel.create({
      name,
      sku: processedSkus,
      price,
      currency,
      images,
      discount: discount || 0,
      SKUName,
      sellingPrice: sellingPrice || null,
      description: description || null,
      shortDescription: shortDescription || null,
      stock: stock || 0,
      sizes: sizes || [],
      dietaryPreference: dietaryPreference || null,
      category: category || null,
      subCategory: subCategory || null,
      ProductCategory: subsubCategory || null,
      brand: brand || null,
      features: features || [],
      specifications: safeParseJSON(specifications, "specifications") || {},
      weight: weight || null,
      weightUnit: weightUnit || null,
      dimensions: dimensions || {},
      productDetail: validatedProductDetail || [],
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

    let pipeline = [
      {
        $match: {
          category: { $regex: new RegExp(`^${category}$`, "i") },
          isActive: true,
        },
      },
      {
        $addFields: {
          productIdStr: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "productIdStr",
          foreignField: "product_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] },
              then: { $avg: "$reviews.rating" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          productIdStr: 0,
          __v: 0,
          reviews: 0,
        },
      },
      { $sample: { size: 5 } },
    ];

    if (category.toLowerCase() === "tiffin") {
      const tiffins = await TiffinModel.aggregate([
        {
          $match: {
            category: { $regex: /^tiffin$/i },
            Active: true,
          },
        },
        {
          $addFields: {
            productIdStr: { $toString: "$_id" },
          },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "productIdStr",
            foreignField: "product_id",
            as: "reviews",
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: "$reviews" }, 0] },
                then: { $avg: "$reviews.rating" },
                else: 0,
              },
            },
          },
        },
        {
          $project: {
            productIdStr: 0,
            __v: 0,
            reviews: 0,
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

    const products = await ProductModel.aggregate(pipeline);

    if (products.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No products found in this category"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          products,
          "Related products retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error in RelatedProducts:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal server error", error.message));
  }
};

const EditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      currency,
      sellingPrice,
      description,
      shortDescription,
      stock,
      SKUName,
      sizes,
      dietaryPreference,
      category,
      brand,
      sku,
      features,
      specifications,
      weight,
      weightUnit,
      dimensions,
      productDetail,
      tags,
      isActive,
    } = req.body;

    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

    const existingName = await ProductModel.findOne({ name });
    if (existingName) {
      return res
        .status(409)
        .json(new ApiError(409, "A product with this name already exists"));
    }

    const imageFiles = req.files?.productImages || [];
    const skuImages = req.files?.skuImages || [];
    const MAX_IMAGES = 10;

    if (imageFiles.length > MAX_IMAGES) {
      return res
        .status(400)
        .json(new ApiError(400, `Maximum ${MAX_IMAGES} images allowed`));
    }

    const updateData = {};
    if (name) updateData.name = name.trim();

    if (price !== undefined) {
      if (price < 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Price cannot be negative"));
      }
      updateData.price = price;
    }

    if (sellingPrice !== undefined) {
      if (sellingPrice < 0 || (price !== undefined && sellingPrice >= price)) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Discount price must be positive and less than regular price"
            )
          );
      }
      updateData.sellingPrice = sellingPrice;
    }

    if (currency) updateData.currency = currency;
    if (SKUName) updateData.SKUName = SKUName;
    if (description) updateData.description = description;
    if (shortDescription) updateData.shortDescription = shortDescription;
    if (stock !== undefined) {
      if (stock < 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Stock cannot be negative"));
      }
      updateData.stock = stock;
    }
    if (dietaryPreference) updateData.dietaryPreference = dietaryPreference;
    if (category) updateData.category = category;
    if (brand) updateData.brand = brand;
    if (features) updateData.features = features;
    if (tags) updateData.tags = tags.map((tag) => tag.trim());
    if (isActive !== undefined) updateData.isActive = isActive;

    if (specifications) {
      const parsedSpecifications = safeParseJSON(
        specifications,
        "specifications"
      );
      if (
        typeof parsedSpecifications !== "object" ||
        Array.isArray(parsedSpecifications)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Specifications must be an object"));
      }
      updateData.specifications = parsedSpecifications;
    }

    if (productDetail) {
      const parsedProductDetail = safeParseJSON(productDetail, "productDetail");
      if (!Array.isArray(parsedProductDetail)) {
        return res
          .status(400)
          .json(new ApiError(400, "productDetail must be an array"));
      }
      updateData.productDetail = parsedProductDetail;
    }

    if (sizes) {
      const parsedSizes = safeParseJSON(sizes, "sizes");
      if (!Array.isArray(parsedSizes)) {
        return res
          .status(400)
          .json(new ApiError(400, "Sizes must be an array"));
      }
      for (const size of parsedSizes) {
        if (
          size.stock < 0 ||
          (size.priceAdjustment && typeof size.priceAdjustment !== "number")
        ) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid size stock or price adjustment"));
        }
      }
      updateData.sizes = parsedSizes;
    }

    if (dimensions) {
      const parsedDimensions = safeParseJSON(dimensions, "dimensions");
      if (
        (parsedDimensions.length && parsedDimensions.length < 0) ||
        (parsedDimensions.width && parsedDimensions.width < 0) ||
        (parsedDimensions.height && parsedDimensions.height < 0) ||
        parsedDimensions.dimensionUnit
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Dimensions cannot be negative"));
      }
      updateData.dimensions = parsedDimensions;
    }

    if (weightUnit !== undefined) {
      const allowedUnits = ["kg", "g", "lb", "oz"];
      if (!allowedUnits.includes(weightUnit)) {
        return res.status(400).json(new ApiError(400, "Invalid weight unit"));
      }
      updateData.weightUnit = weightUnit;
    }

    if (weight !== undefined) {
      if (weight < 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Weight cannot be negative"));
      }
      updateData.weight = weight;
    }

    if (imageFiles.length > 0) {
      const uploadPromises = imageFiles.map((file) =>
        uploadToCloudinary(file.path)
      );
      const uploadResults = await Promise.all(uploadPromises);
      const imageUrls = uploadResults.map((result, index) => ({
        url: result.secure_url,
        isPrimary: index === 0,
      }));
      if (
        !imageUrls.every(
          (img) => typeof img.url === "string" && img.url.trim() !== ""
        )
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "All uploaded images must have valid URLs"));
      }
      updateData.images = imageUrls;
    }

    if (sku) {
      const updatedSkuArray = safeParseJSON(sku, "sku");
      if (!Array.isArray(updatedSkuArray)) {
        return res.status(400).json(new ApiError(400, "SKU must be an array"));
      }

      const skuCodes = updatedSkuArray.map((item) => item.code);
      const existingProduct = await ProductModel.findOne({
        "sku.code": { $in: skuCodes },
        _id: { $ne: id },
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

      const MAX_IMAGES_PER_SKU = 5;
      const uploadedSkuArray = await Promise.all(
        updatedSkuArray.map(async (skuItem, index) => {
          try {
            const { details } = skuItem;
            let processedDetails = { ...details };

            if (skuImages.length > MAX_IMAGES_PER_SKU) {
              throw new ApiError(
                400,
                `Maximum ${MAX_IMAGES_PER_SKU} images allowed per SKU`
              );
            }

            if (skuImages.length > 0) {
              const uploadResults = await Promise.all(
                skuImages.map((file) => uploadToCloudinary(file.path))
              );

              processedDetails.images = uploadResults.map((result, i) => ({
                url: result.secure_url,
                isPrimary: i === 0,
              }));
            } else {
              processedDetails.images = processedDetails.images || [];
            }

            return {
              details: processedDetails,
            };
          } catch (error) {
            return { error, code: skuItem.code };
          }
        })
      );
      updateData.sku = uploadedSkuArray;
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

const HomePageProduct = async (req, res) => {
  try {
    const Category = await ProductModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          product: { $first: "$$ROOT" },
        },
      },
      { $sample: { size: 6 } },
      {
        $replaceRoot: { newRoot: "$product" },
      },
    ]);
    let additionalProducts = [];
    if (Category.length < 6) {
      const additionalCount = 6 - Category.length;
      const usedCategories = Category.map((item) => item.category);
      additionalProducts = await ProductModel.aggregate([
        {
          $match: {
            isActive: true,
            category: { $nin: usedCategories },
          },
        },
        { $sample: { size: additionalCount } },
      ]);
    }
    const finalCategoryProducts = [...Category, ...additionalProducts].slice(
      0,
      6
    );

    const OurProduct = await ProductModel.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 5 } },
    ]);

    const NewProducts = await ProductModel.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { Category: finalCategoryProducts, OurProduct, NewProducts },
          "Product data fetched"
        )
      );
  } catch (error) {
    console.error("Error fetching home page products:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Server error while fetching products"));
  }
};

module.exports = {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  HomePageProduct,
};
