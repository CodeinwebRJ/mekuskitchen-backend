const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CouponModel = require("../models/Coupon.model");
const CategoryModel = require("../models/Category.model");
const mongoose = require("mongoose");

const getAllCoupons = async (req, res) => {
  try {
    const { page, limit, isActive, discountType, sortBy, sortOrder, expired } =
      req.query;

    const query = {};
    if (isActive !== undefined) {
      if (!["true", "false"].includes(isActive)) {
        return res
          .status(400)
          .json(new ApiError(400, "isActive must be 'true' or 'false'"));
      }
      query.isActive = isActive === "true";
    }

    if (discountType) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res
          .status(400)
          .json(
            new ApiError(400, "discountType must be 'percentage' or 'fixed'")
          );
      }
      query.discountType = discountType;
    }

    if (expired !== "true") {
      query.$or = [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page number must be a positive integer",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive integer not exceeding 100",
      });
    }

    const validSortFields = ["createdAt", "discountValue", "expiresAt", "code"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder.toLowerCase() === "asc" ? 1 : -1;

    const [coupons, totalCount] = await Promise.all([
      CouponModel.find(query)
        .select("-__v")
        .sort({ [sortField]: sortDirection })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      CouponModel.countDocuments(query),
    ]);

    const response = {
      data: {
        coupons: coupons || [],
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum) || 1,
          totalItems: totalCount,
          limit: limitNum,
          hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
          hasPreviousPage: pageNum > 1,
        },
      },
    };

    return res
      .status(200)
      .json(new ApiResponse(200, response, "Coupons fetched successfully"));
  } catch (error) {
    console.error("Error in getAllCoupons:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};

const ValidateCoupon = async (req, res) => {
  try {
    const { code, orderTotal, date, category, subCategory, subSubCategory } =
      req.query;

    if (!code || !orderTotal) {
      return res
        .status(400)
        .json(new ApiError(400, "Coupon code and order total are required"));
    }

    const orderAmount = parseFloat(orderTotal);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Order total must be a positive number"));
    }

    let validationDate = new Date();
    if (date) {
      const datePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
      if (!datePattern.test(date)) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid date format. Use DD-MM-YYYY"));
      }
      const [day, month, year] = date.split("-").map(Number);
      validationDate = new Date(year, month - 1, day);
      if (
        isNaN(validationDate.getTime()) ||
        validationDate.getFullYear() !== year
      ) {
        return res.status(400).json(new ApiError(400, "Invalid date values."));
      }
    }

    const trimmedCode = code.trim().toUpperCase();

    // Fetch coupon first (don't increment yet)
    const coupon = await CouponModel.findOne({
      code: trimmedCode,
      isActive: true,
      $or: [
        { startAt: { $exists: false } },
        { startAt: { $lte: validationDate } },
      ],
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: validationDate } },
      ],
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    }).lean();

    if (!coupon) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "Coupon not found, inactive, or usage limit reached"
          )
        );
    }

    const inputCategories = {
      category: category?.split(",").map((c) => c.trim()) || [],
      subCategory: subCategory?.split(",").map((c) => c.trim()) || [],
      subSubCategory: subSubCategory?.split(",").map((c) => c.trim()) || [],
    };

    const hasCategoryRestriction =
      coupon.category?.length ||
      coupon.subCategory?.length ||
      coupon.subSubCategory?.length;

    if (hasCategoryRestriction) {
      let matched = false;
      const couponCategoryNames = coupon.category?.map((cat) => cat) || [];
      const fullCategories = await CategoryModel.find({
        $or: [{ name: { $in: couponCategoryNames } }],
        isActive: true,
      }).lean();

      for (const cat of fullCategories) {
        if (
          inputCategories.category.includes(String(cat._id)) ||
          inputCategories.category.includes(cat.name)
        ) {
          matched = true;
          break;
        }

        const subCatIds = cat.subCategories?.map((sc) => String(sc._id)) || [];
        const subCatNames = cat.subCategories?.map((sc) => sc.name) || [];
        if (
          subCatIds.some((id) => inputCategories.subCategory.includes(id)) ||
          subCatNames.some((name) => inputCategories.subCategory.includes(name))
        ) {
          matched = true;
          break;
        }

        const subSubCatIds =
          cat.subCategories?.flatMap(
            (sc) => sc.subSubCategories?.map((ssc) => String(ssc._id)) || []
          ) || [];
        const subSubCatNames =
          cat.subCategories?.flatMap(
            (sc) => sc.subSubCategories?.map((ssc) => ssc.name) || []
          ) || [];
        if (
          subSubCatIds.some((id) =>
            inputCategories.subSubCategory.includes(id)
          ) ||
          subSubCatNames.some((name) =>
            inputCategories.subSubCategory.includes(name)
          )
        ) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Coupon not applicable to selected categories")
          );
      }
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Order total must be at least ${coupon.minOrderAmount}`
          )
        );
    }

    // If everything valid, now increment usedCount
    await CouponModel.updateOne(
      { _id: coupon._id },
      { $inc: { usedCount: 1 } }
    );

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (coupon.discountValue / 100) * orderAmount;
      discount = Math.min(discount, orderAmount);
    } else if (coupon.discountType === "fixed") {
      discount = Math.min(coupon.discountValue, orderAmount);
    }

    discount = Math.round(discount * 100) / 100;

    let formattedExpiresAt = null;
    if (coupon.expiresAt) {
      const expiresDate = new Date(coupon.expiresAt);
      formattedExpiresAt = expiresDate.toLocaleDateString("en-GB");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          valid: true,
          code: coupon.code,
          discount,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount || 0,
          expiresAt: formattedExpiresAt,
          usageLimit: coupon.usageLimit,
          usedCount: coupon.usedCount + 1,
        },
        "Coupon validated successfully"
      )
    );
  } catch (error) {
    console.error("Coupon validation error:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const CreateCoupons = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      startAt,
      expiresAt,
      usageLimit,
      image,
      isActive,
      termsAndConditions,
      description,
      category,
      subCategory,
      subSubCategory,
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Code, discountType, and discountValue are required"
          )
        );
    }

    // Helper function to validate and trim category-like arrays
    const validateStringArray = (arr, fieldName) => {
      if (arr !== undefined) {
        if (!Array.isArray(arr)) {
          throw new ApiError(400, `${fieldName} must be an array of strings`);
        }
        const isValid = arr.every(
          (item) => typeof item === "string" && item.trim() !== ""
        );
        if (!isValid) {
          throw new ApiError(
            400,
            `Each ${fieldName} must be a non-empty string`
          );
        }
        return arr.map((item) => item.trim());
      }
      return [];
    };

    const parsedCategory = validateStringArray(category, "category");
    const parsedSubCategory = validateStringArray(subCategory, "subCategory");
    const parsedSubSubCategory = validateStringArray(
      subSubCategory,
      "subSubCategory"
    );

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 3 || trimmedCode.length > 20) {
      return res
        .status(400)
        .json(new ApiError(400, "Code must be between 3 and 20 characters"));
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return res
        .status(400)
        .json(
          new ApiError(400, "discountType must be 'percentage' or 'fixed'")
        );
    }

    const parsedDiscountValue = parseFloat(discountValue);
    if (isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Discount value must be a positive number"));
    }
    if (discountType === "percentage" && parsedDiscountValue > 100) {
      return res
        .status(400)
        .json(new ApiError(400, "Percentage discount cannot exceed 100"));
    }

    let parsedMinOrderAmount = 0;
    if (minOrderAmount !== undefined) {
      parsedMinOrderAmount = parseFloat(minOrderAmount);
      if (isNaN(parsedMinOrderAmount) || parsedMinOrderAmount < 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Minimum order amount cannot be negative"));
      }
    }

    let parsedStartAt = undefined;
    if (startAt) {
      const datePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
      if (!datePattern.test(startAt)) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Invalid startAt date format. Use DD-MM-YYYY")
          );
      }
      const [day, month, year] = startAt.split("-").map(Number);
      parsedStartAt = new Date(year, month - 1, day);
      if (
        isNaN(parsedStartAt.getTime()) ||
        parsedStartAt.getFullYear() !== year
      ) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Invalid startAt date. Check format and values.")
          );
      }
    }

    let parsedExpiresAt = undefined;
    if (expiresAt) {
      const datePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
      if (!datePattern.test(expiresAt)) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Invalid expiresAt date format. Use DD-MM-YYYY")
          );
      }
      const [day, month, year] = expiresAt.split("-").map(Number);
      parsedExpiresAt = new Date(year, month - 1, day);
      if (
        isNaN(parsedExpiresAt.getTime()) ||
        parsedExpiresAt.getFullYear() !== year
      ) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Invalid expiresAt date. Check format and values."
            )
          );
      }
      if (parsedStartAt && parsedExpiresAt <= parsedStartAt) {
        return res
          .status(400)
          .json(new ApiError(400, "expiresAt must be after startAt"));
      }
    }

    let parsedUsageLimit = 1;
    if (usageLimit !== undefined) {
      parsedUsageLimit = parseInt(usageLimit);
      if (isNaN(parsedUsageLimit) || parsedUsageLimit <= 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Usage limit must be a positive integer"));
      }
    }

    if (image && typeof image !== "string") {
      return res
        .status(400)
        .json(new ApiError(400, "Image must be a valid string URL"));
    }

    const parsedIsActive = isActive !== undefined ? Boolean(isActive) : true;

    const existingCoupon = await CouponModel.findOne({ code: trimmedCode });
    if (existingCoupon) {
      return res
        .status(400)
        .json(new ApiError(400, "Coupon code already exists"));
    }

    const coupon = new CouponModel({
      code: trimmedCode,
      discountType,
      discountValue: parsedDiscountValue,
      minOrderAmount: parsedMinOrderAmount,
      startAt: parsedStartAt,
      expiresAt: parsedExpiresAt,
      usageLimit: parsedUsageLimit,
      usedCount: 0,
      image,
      isActive: parsedIsActive,
      termsAndConditions,
      description,
      category: parsedCategory,
      subCategory: parsedSubCategory,
      subSubCategory: parsedSubSubCategory,
    });

    await coupon.save();

    const couponData = coupon.toObject();
    if (couponData.startAt) {
      const startDate = new Date(couponData.startAt);
      couponData.startAt = startDate.toLocaleDateString("en-GB");
    }
    if (couponData.expiresAt) {
      const expiresDate = new Date(couponData.expiresAt);
      couponData.expiresAt = expiresDate.toLocaleDateString("en-GB");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, couponData, "Coupon created successfully"));
  } catch (error) {
    console.error("Create coupon error:", error);
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(statusCode)
      .json(new ApiError(statusCode, error.message || "Internal Server Error"));
  }
};

const EditCoupons = async (req, res) => {
  try {
    const {
      couponId,
      code,
      discountType,
      discountValue,
      minOrderAmount,
      startAt,
      expiresAt,
      usageLimit,
      image,
      isActive,
      termsAndConditions,
      description,
    } = req.body;

    if (!couponId) {
      return res.status(400).json(new ApiError(400, "Coupon ID is required"));
    }

    const coupon = await CouponModel.findById(couponId);
    if (!coupon) {
      return res.status(404).json(new ApiError(404, "Coupon not found"));
    }

    const updateData = {};

    if (code) {
      const trimmedCode = code.trim().toUpperCase();
      if (trimmedCode.length < 3 || trimmedCode.length > 20) {
        return res
          .status(400)
          .json(new ApiError(400, "Code must be between 3 and 20 characters"));
      }

      if (trimmedCode !== coupon.code) {
        const existingCoupon = await CouponModel.findOne({ code: trimmedCode });
        if (existingCoupon) {
          return res
            .status(400)
            .json(new ApiError(400, "Coupon code already exists"));
        }
        updateData.code = trimmedCode;
      }
    }

    if (discountType) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res
          .status(400)
          .json(
            new ApiError(400, "discountType must be 'percentage' or 'fixed'")
          );
      }
      updateData.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const parsedDiscountValue = parseFloat(discountValue);
      if (isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Discount value must be a positive number"));
      }
      if (
        (discountType || coupon.discountType) === "percentage" &&
        parsedDiscountValue > 100
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Percentage discount cannot exceed 100"));
      }
      updateData.discountValue = parsedDiscountValue;
    }

    if (minOrderAmount !== undefined) {
      const parsedMinOrderAmount = parseFloat(minOrderAmount);
      if (isNaN(parsedMinOrderAmount) || parsedMinOrderAmount < 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Minimum order amount cannot be negative"));
      }
      updateData.minOrderAmount = parsedMinOrderAmount;
    }

    if (startAt !== undefined) {
      if (startAt === null) {
        updateData.startAt = null;
      } else {
        const parsedStartAt = new Date(startAt);
        if (isNaN(parsedStartAt.getTime())) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                "Invalid startAt date format. Use ISO 8601 format"
              )
            );
        }
        updateData.startAt = parsedStartAt;
      }
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                "Invalid expiresAt date format. Use ISO 8601 format"
              )
            );
        }
        if (updateData.startAt && parsedExpiresAt <= updateData.startAt) {
          return res
            .status(400)
            .json(new ApiError(400, "expiresAt must be after startAt"));
        }
        updateData.expiresAt = parsedExpiresAt;
      }
    }

    if (usageLimit !== undefined) {
      const parsedUsageLimit = parseInt(usageLimit);
      if (isNaN(parsedUsageLimit) || parsedUsageLimit <= 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Usage limit must be a positive integer"));
      }
      if (parsedUsageLimit < coupon.usedCount) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              "Usage limit cannot be less than current used count"
            )
          );
      }
      updateData.usageLimit = parsedUsageLimit;
    }

    if (image !== undefined) {
      if (image !== null && typeof image !== "string") {
        return res
          .status(400)
          .json(new ApiError(400, "Image must be a valid string URL or null"));
      }
      updateData.image = image;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (termsAndConditions !== undefined) {
      if (termsAndConditions !== null) {
        const trimmedTerms = termsAndConditions.trim().replace(/[<>&"]/g, "");
        if (trimmedTerms.length > 1000) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                "Terms and conditions cannot exceed 1000 characters"
              )
            );
        }
        updateData.termsAndConditions = trimmedTerms;
      } else {
        updateData.termsAndConditions = null;
      }
    }

    if (description !== undefined) {
      if (description !== null) {
        const trimmedDescription = description.trim().replace(/[<>&"]/g, "");
        if (trimmedDescription.length > 500) {
          return res
            .status(400)
            .json(
              new ApiError(400, "Description cannot exceed 500 characters")
            );
        }
        updateData.description = trimmedDescription;
      } else {
        updateData.description = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "No valid fields provided for update"));
    }

    const updatedCoupon = await CouponModel.findByIdAndUpdate(
      couponId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCoupon) {
      return res.status(404).json(new ApiError(404, "Coupon not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
  } catch (error) {
    console.error("Edit coupon error:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const DeleteCoupons = async (req, res) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json(new ApiError(400, "Coupon ID is required"));
    }

    if (!couponId.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid Coupon ID format"));
    }

    const coupon = await CouponModel.findById(couponId);
    if (!coupon) {
      return res.status(404).json(new ApiError(404, "Coupon not found"));
    }

    coupon.isActive = false;
    await coupon.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Coupon deleted successfully"));
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = {
  getAllCoupons,
  CreateCoupons,
  EditCoupons,
  ValidateCoupon,
  DeleteCoupons,
};
