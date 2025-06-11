const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const RegiesterAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, avatar } = req.body;
  } catch (error) {
    console.log(error);
  }
};

const Adminlogin = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

module.exports = { Adminlogin, RegiesterAdmin };
