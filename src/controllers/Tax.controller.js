const TaxModel = require("../models/Tax.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const getTaxRate = async (req, res) => {
  try {
    const { search, category } = req.query;
    if (!search && !category) {
      const allConfigs = await TaxModel.find({});
      return res
        .status(200)
        .json(
          new ApiResponse(200, allConfigs, "All tax configurations retrieved")
        );
    }

    if (!search && category) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Search field (province code or name) is required when querying by category"
          )
        );
    }

    const normalizedSearch = search.trim().toLowerCase();

    const config = await TaxModel.findOne({
      $or: [
        { provinceCode: normalizedSearch.toUpperCase() },
        { provinceName: new RegExp(`^${normalizedSearch}$`, "i") },
      ],
    });

    if (!config) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No tax configuration found"));
    }

    if (!category) {
      return res
        .status(200)
        .json(new ApiResponse(200, config, "Tax configuration retrieved"));
    }

    const categories = Array.isArray(category) ? category : [category];

    const results = categories.map((cat) => {
      const found = config.taxes.find(
        (t) => t.category.toLowerCase() === cat.trim().toLowerCase()
      );

      return {
        category: cat,
        provinceTax: found ? found.provinceTax : null,
        federalTax: found ? found.federalTax : null,
        message: found
          ? "Tax rate retrieved successfully"
          : `No tax rate found for category: ${cat}`,
      };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          provinceCode: config.provinceCode,
          provinceName: config.provinceName,
          results,
        },
        "Tax rates processed"
      )
    );
  } catch (error) {
    console.error("Error in getTaxRate:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const CreateTax = async (req, res) => {
  try {
    const { provinceCode, provinceName, taxes } = req.body;
    if (!provinceCode || !provinceName || !Array.isArray(taxes)) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "provinceCode, provinceName, and taxes (as array) are required"
          )
        );
    }

    if (taxes.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Taxes array cannot be empty"));
    }
    for (const [index, tax] of taxes.entries()) {
      if (
        !tax.category ||
        typeof tax.provinceTax !== "number" ||
        typeof tax.federalTax !== "number"
      ) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Invalid tax object at index ${index}. Ensure category, provinceTax, and federalTax are valid.`
            )
          );
      }
    }
    const lowerCategories = taxes.map((t) => t.category.trim().toLowerCase());
    const hasDuplicates = lowerCategories.some(
      (cat, i) => lowerCategories.indexOf(cat) !== i
    );
    if (hasDuplicates) {
      return res
        .status(400)
        .json(new ApiError(400, "Duplicate category names are not allowed"));
    }
    const existing = await TaxModel.findOne({ provinceCode });
    if (existing) {
      return res
        .status(409)
        .json(
          new ApiError(
            409,
            "Tax configuration for this province already exists"
          )
        );
    }
    const newTax = new TaxModel({ provinceCode, provinceName, taxes });
    await newTax.save();

    return res
      .status(201)
      .json(
        new ApiResponse(201, newTax, "Tax configuration created successfully")
      );
  } catch (error) {
    console.error("Error in CreateTax:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const EditTax = async (req, res) => {
  try {
    const { provinceCode, provinceName, taxes } = req.body;
    if (!provinceCode) {
      return res
        .status(400)
        .json(new ApiError(400, "provinceCode is required in request body"));
    }
    if (!provinceName && !taxes) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "At least one of provinceName or taxes must be provided for update"
          )
        );
    }
    if (taxes) {
      if (!Array.isArray(taxes) || taxes.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Taxes must be a non-empty array"));
      }
      for (const [i, tax] of taxes.entries()) {
        if (
          !tax.category ||
          typeof tax.provinceTax !== "number" ||
          typeof tax.federalTax !== "number"
        ) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Invalid tax object at index ${i}. All fields are required`
              )
            );
        }
      }
      const categories = taxes.map((t) => t.category.trim().toLowerCase());
      const hasDuplicates = categories.some(
        (cat, i) => categories.indexOf(cat) !== i
      );
      if (hasDuplicates) {
        return res
          .status(400)
          .json(new ApiError(400, "Duplicate category names are not allowed"));
      }
    }
    const updateFields = {};
    if (provinceName) updateFields.provinceName = provinceName;
    if (taxes) updateFields.taxes = taxes;

    const updatedTax = await TaxModel.findOneAndUpdate(
      { provinceCode },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedTax) {
      return res
        .status(404)
        .json(new ApiError(404, "Tax configuration not found"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedTax,
          "Tax configuration updated successfully"
        )
      );
  } catch (error) {
    console.error("Error in EditTax:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const DeleteTax = async (req, res) => {
  try {
    const { provinceCode } = req.query;
    if (!provinceCode) {
      return res
        .status(400)
        .json(
          new ApiError(400, "provinceCode is required in query parameters")
        );
    }
    const deleted = await TaxModel.findOneAndDelete({ provinceCode });

    if (!deleted) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            `Tax configuration for provinceCode '${provinceCode}' not found`
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "Tax configuration deleted successfully")
      );
  } catch (error) {
    console.error("Error in DeleteTax:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

module.exports = {
  getTaxRate,
  CreateTax,
  EditTax,
  DeleteTax,
};
