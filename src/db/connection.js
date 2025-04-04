require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  console.log(process.env.MONGODB_URI);
  if (!process.env.MONGODB_URI) {
    return res
      .status(400)
      .json(new Error("MONGODB_URI is not defined in environment variables"));
  }

  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(
      `\n MongoDB connected! Host: ${connectionInstance.connection.host}`
    );
    return connectionInstance;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    return res.status(400).json(error); // Propagate the error to be handled by the server
  }
};

module.exports = connectDB;
