const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const ApiError = require("./ApiError");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.dir(error, { depth: null });
    return res
      .status(400)
      .json(new ApiError(`Cloudinary upload error: ${error.message}`));
  }
};

const destroyCloudImage = async (publicId) => {
  try {
    if (!publicId) return null;

    const response = await cloudinary.uploader.destroy(publicId);

    return response;
  } catch (error) {
    console.error("Error destroying file on Cloudinary:", error);
    return res
      .status(400)
      .json(new ApiError(`Cloudinary destroy error: ${error.message}`));
  }
};

module.exports = { uploadToCloudinary, destroyCloudImage };
