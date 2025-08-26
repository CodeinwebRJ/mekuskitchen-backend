const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const ProductModel = require("../models/Product.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ReviewModel = require("../models/Review.model");
const OrderModel = require("../models/Order.model");
const ContactModel = require("../models/Contact.model");
const AddressModel = require("../models/Address.model");
const mongoose = require("mongoose");

const safeParseJSON = (data, fieldName) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return res
      .status(400)
      .json(new ApiError(400, `Invalid JSON for ${fieldName}`));
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
      variation,
      price,
      isActive,
    } = req.body;

    if (!page || !limit) {
      return res
        .status(400)
        .json(new ApiError(400, "Page and limit are required"));
    }

    const skip = (page - 1) * limit;

    const query = {};
    const andConditions = [];

    if (search && typeof search === "string") {
      const regex = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [
          { name: regex },
          { description: regex },
          { brand: regex },
          { shortDescription: regex },
        ],
      });
    }

    const sanitizeArray = (arr) =>
      Array.isArray(arr)
        ? arr.filter((item) => typeof item === "string" && item.trim())
        : [];

    const filters = {
      category: sanitizeArray(category),
      subCategory: sanitizeArray(subCategory),
      ProductCategory: sanitizeArray(ProductCategory),
      brand: sanitizeArray(brand),
    };

    Object.keys(filters).forEach((key) => {
      if (filters[key].length) {
        query[key] = { $in: filters[key] };
      }
    });

    if (typeof isActive === "boolean") {
      query.isActive = isActive;
    } else if (typeof isActive === "string") {
      const val = isActive.toLowerCase();
      if (val === "true") query.isActive = true;
      else if (val === "false") query.isActive = false;
    }

    if (Array.isArray(price) && price.length === 2) {
      const [min, max] = price.map(Number);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        query.price = { $gte: min, $lte: max };
      } else {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid price range provided"));
      }
    }

    if (Array.isArray(ratings) && ratings.length > 0) {
      const validRatings = ratings
        .map(Number)
        .filter((r) => !isNaN(r) && r >= 0 && r <= 5);

      if (validRatings.length) {
        const minRating = Math.min(...validRatings);
        query.averageRating = { $gte: minRating };
      }
    }

    if (variation === "product") {
      andConditions.push({
        $or: [{ sku: { $size: 0 } }, { sku: null }],
      });
    } else if (variation === "sku") {
      query["sku.0"] = { $exists: true };
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const sortStage = {};
    switch (sortBy?.toLowerCase()) {
      case "high-to-low":
        sortStage.price = -1;
        break;
      case "low-to-high":
        sortStage.price = 1;
        break;
      case "sortbyaverageratings":
        sortStage.averageRating = -1;
        break;
      case "sortbylatest":
        sortStage.createdAt = -1;
        break;
      default:
        sortStage.createdAt = -1;
    }

    const total = await ProductModel.countDocuments(query);
    const products = await ProductModel.find(query)
      .sort(sortStage)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    let activeAddress = null;
    if (req.user && req.user._id) {
      activeAddress = await AddressModel.findOne({
        user: req.user._id,
        isActive: true,
      }).lean();
    }

    const response = {
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      data: products,
      activeAddress: activeAddress || null,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, response, "Fetched Data Successfully"));
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return res
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
      isTaxFree,
      currency,
      manageInvantory,
      aboutItem,
    } = req.body;

    const existingName = await ProductModel.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
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
      sellingPrice: sellingPrice || "",
      description: description || "",
      shortDescription: shortDescription || "",
      stock: stock || 0,
      sizes: sizes || [],
      dietaryPreference: dietaryPreference || "",
      category: category || "",
      subCategory: subCategory || "",
      ProductCategory: subsubCategory || "",
      brand: brand || "",
      features: features || [],
      specifications: safeParseJSON(specifications, "specifications") || {},
      weight: weight || "",
      weightUnit: weightUnit || "",
      dimensions: dimensions || {},
      productDetail: validatedProductDetail || [],
      tags: tags || [],
      isTaxFree: isTaxFree || false,
      aboutItem: aboutItem || [],
      manageInvantory: manageInvantory || true,
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

    const product = await ProductModel.findById(id).select("-__v");

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
        $project: {
          __v: 0,
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
          $project: {
            __v: 0,
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
    if (!id) {
      return res.status(400).json(new ApiError(400, "Product ID is required"));
    }

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
      subCategory,
      subsubCategory,
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
      isTaxFree,
      aboutItem,
      manageInvantory,
      images,
    } = req.body;

    const existingName = await ProductModel.findOne({ name, _id: { $ne: id } });
    if (existingName) {
      return res
        .status(409)
        .json(new ApiError(409, "A product with this name already exists"));
    }

    const updateData = {};

    if (name) updateData.name = name.trim();
    if (price !== undefined) {
      if (price < 0)
        return res
          .status(400)
          .json(new ApiError(400, "Price cannot be negative"));
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
      if (stock < 0)
        return res
          .status(400)
          .json(new ApiError(400, "Stock cannot be negative"));
      updateData.stock = stock;
    }

    if (dietaryPreference) updateData.dietaryPreference = dietaryPreference;
    if (category) updateData.category = category;
    if (subCategory) updateData.subCategory = subCategory;
    if (subsubCategory) updateData.ProductCategory = subsubCategory;
    if (brand) updateData.brand = brand;
    if (features) updateData.features = features;
    if (tags) updateData.tags = tags.map((tag) => tag.trim());
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isTaxFree !== undefined) updateData.isTaxFree = isTaxFree;
    if (aboutItem) updateData.aboutItem = aboutItem;
    if (manageInvantory !== undefined)
      updateData.manageInvantory = manageInvantory;

    if (specifications) {
      const parsedSpecs = safeParseJSON(specifications, "specifications");
      if (typeof parsedSpecs !== "object" || Array.isArray(parsedSpecs)) {
        return res
          .status(400)
          .json(new ApiError(400, "Specifications must be an object"));
      }
      updateData.specifications = parsedSpecs;
    }

    if (productDetail) {
      const parsedDetail = safeParseJSON(productDetail, "productDetail");
      if (!Array.isArray(parsedDetail)) {
        return res
          .status(400)
          .json(new ApiError(400, "productDetail must be an array"));
      }
      updateData.productDetail = parsedDetail.map((detail) => ({ ...detail }));
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
        (parsedDimensions.height && parsedDimensions.height < 0)
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Dimensions cannot be negative"));
      }
      updateData.dimensions = parsedDimensions;
    }

    if (weightUnit) {
      const allowedUnits = ["kg", "g", "lb", "oz"];
      if (!allowedUnits.includes(weightUnit)) {
        return res.status(400).json(new ApiError(400, "Invalid weight unit"));
      }
      updateData.weightUnit = weightUnit;
    }

    if (weight !== undefined) {
      if (weight < 0)
        return res
          .status(400)
          .json(new ApiError(400, "Weight cannot be negative"));
      updateData.weight = weight;
    }

    if (images) {
      updateData.images = images;
    }

    if (sku) {
      const parsedSkus = safeParseJSON(sku, "sku");
      if (!Array.isArray(parsedSkus)) {
        return res.status(400).json(new ApiError(400, "SKU must be an array"));
      }

      const skuCodes = parsedSkus.map((item) => item.SKUname);
      const existingSkuProduct = await ProductModel.findOne({
        "sku.details.SKUname": { $in: skuCodes },
        _id: { $ne: id },
      });

      if (existingSkuProduct) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "A product with one of these SKU codes already exists"
            )
          );
      }

      const processedSkus = parsedSkus.map((skuItem) => ({
        details: skuItem || {},
      }));

      updateData.sku = processedSkus;
    }

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Product updated successfully"));
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
  }
};

const DeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    await ProductModel.findByIdAndDelete(id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Product deleted successfully"));
  } catch (error) {
    console.log(error);
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
      { $sample: { size: 10 } },
      {
        $replaceRoot: { newRoot: "$product" },
      },
    ]);

    let additionalProducts = [];

    if (Category.length < 10) {
      const additionalCount = 10 - Category.length;
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
      10
    );

    const OurProduct = await ProductModel.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 10 } },
    ]);

    const NewProducts = await ProductModel.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    const TopReviewsRaw = await ReviewModel.find({ rating: { $gte: 4 } })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .lean();

    const productIds = TopReviewsRaw.map((r) => r.product_id);

    const productsMap = await ProductModel.find({ _id: { $in: productIds } })
      .select("name image")
      .lean()
      .then((products) =>
        products.reduce((acc, product) => {
          acc[product._id.toString()] = product;
          return acc;
        }, {})
      );

    const TopReviews = TopReviewsRaw.map((review) => ({
      ...review,
      product: productsMap[review.product_id] || null,
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          Category: finalCategoryProducts,
          OurProduct,
          NewProducts,
          TopReviews,
        },
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

const SearchProducts = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || search.trim() === "") {
      return res
        .status(200)
        .json(new ApiError(400, "Search query is required."));
    }

    const searchRegex = new RegExp(search, "i");

    const products = await ProductModel.find({
      $or: [
        { name: { $regex: searchRegex } },
        { SKUName: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ],
      isActive: true,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, products, "product get successfully"));
  } catch (error) {
    console.error("Search error:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong while searching for products.")
      );
  }
};

const AdminDashboard = async (req, res) => {
  try {
    const skuProductCount = await ProductModel.countDocuments({
      "sku.0": { $exists: true },
    });

    const normalProductCount = await ProductModel.countDocuments({
      $or: [{ sku: { $exists: false } }, { sku: { $size: 0 } }, { sku: null }],
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysOrderCount = await OrderModel.countDocuments({
      Orderdate: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    const todaysContactCount = await ContactModel.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          skuProductCount,
          normalProductCount,
          todaysOrderCount,
          todaysContactCount,
        },
        "Dashboard data fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Internal server error while fetching dashboard data")
      );
  }
};

module.exports = {
  getAllProducts,
  CreateProduct,
  getProductById,
  RelatedProducts,
  EditProduct,
  DeleteProduct,
  HomePageProduct,
  SearchProducts,
  AdminDashboard,
};
