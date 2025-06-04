const TaxModel = require("../models/Tax.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const getTaxRate = async (req, res) => {
  const { provinceCode, category } = req.query;
  try {
    if (!provinceCode && !category) {
      const allConfigs = await TaxModel.find({});
      return res
        .status(200)
        .json(
          new ApiResponse(200, allConfigs, "All tax configurations retrieved")
        );
    }

    if (provinceCode && !category) {
      const config = await TaxModel.findOne({ provinceCode });

      if (!config) {
        return res
          .status(404)
          .json(
            new ApiError(
              404,
              `No tax configuration found for province code: ${provinceCode}`
            )
          );
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            config,
            `Tax configuration retrieved for province: ${provinceCode}`
          )
        );
    }

    if (!provinceCode || !category) {
      return res
        .status(400)
        .json(new ApiError(400, "provinceCode and category are required"));
    }

    const categories = Array.isArray(category) ? category : [category];
    const config = await TaxModel.findOne({ provinceCode });

    if (!config) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            `No tax configuration found for province code: ${provinceCode}`
          )
        );
    }

    const results = categories.map((cat) => {
      const found = config.taxes.find(
        (t) => t.category.toLowerCase() === cat.toLowerCase()
      );
      return {
        category: cat,
        taxRate: found ? found.taxRate : null,
        message: found
          ? "Tax rate retrieved successfully"
          : `No tax rate found for category: ${cat}`,
      };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          provinceCode,
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
  const { provinceCode, provinceName, taxes } = req.body;

  if (!provinceCode || !provinceName || !Array.isArray(taxes)) {
    return res
      .status(400)
      .json(
        new ApiError(400, "provinceCode, provinceName, and taxes are required")
      );
  }

  try {
    const existing = await TaxModel.findOne({ provinceCode });
    if (existing) {
      return res
        .status(409)
        .json(new ApiError(409, "Tax config already exists"));
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
  const { provinceCode, provinceName, taxes } = req.body;

  if (!provinceCode) {
    return res
      .status(400)
      .json(new ApiError(400, "provinceCode is required in params"));
  }

  try {
    const updatedTax = await TaxModel.findOneAndUpdate(
      { provinceCode },
      { $set: { provinceName, taxes } },
      { new: true }
    );

    if (!updatedTax) {
      return res.status(404).json(new ApiError(404, "Tax config not found"));
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
  const { provinceCode } = req.query;

  if (!provinceCode) {
    return res
      .status(400)
      .json(new ApiError(400, "provinceCode is required in params"));
  }

  try {
    const deleted = await TaxModel.findOneAndDelete({ provinceCode });

    if (!deleted) {
      return res.status(404).json(new ApiError(404, "Tax config not found"));
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
