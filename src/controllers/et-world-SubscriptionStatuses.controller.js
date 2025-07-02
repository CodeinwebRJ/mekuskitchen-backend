const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  SignedDataVerifier,
  Environment,
} = require("@apple/app-store-server-library");
const jwt = require("jsonwebtoken");

const APPLE_API_BASE_URL =
  process.env.APPLE_API_ENV === "production"
    ? "https://api.storekit.itunes.apple.com"
    : "https://api.storekit-sandbox.itunes.apple.com";

const validateParams = (params, requiredFields) => {
  for (const field of requiredFields) {
    if (
      !params?.[field] ||
      typeof params[field] !== "string" ||
      params[field].trim() === ""
    ) {
      throw new ApiError(400, `Missing or invalid ${field}`);
    }
  }
};

const DecodeJWT = (token) => {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = Buffer.from(base64Payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Invalid JWT token:", error.message);
    return null;
  }
};

// Apple API Axios instance
const appleApiClient = axios.create({
  baseURL: APPLE_API_BASE_URL,
  timeout: 10000,
});

// Make Apple API Request
const makeAppleApiRequest = async (method, url, token, data = null) => {
  try {
    const response = await appleApiClient({
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data,
    });
    return response;
  } catch (error) {
    console.error(`Apple API error (${method} ${url}):`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.error?.message || "Apple API request failed"
    );
  }
};

// Load Apple Root CAs
const APPLE_ROOT_CA_PATHS = [
  path.resolve(__dirname, "../config/keys/certs/AppleRootCA-G3.cer"),
];

const loadRootCAs = async () => {
  try {
    const certs = await Promise.all(
      APPLE_ROOT_CA_PATHS.map(async (certPath) => {
        return await fs.readFile(certPath); // Read as buffer
      })
    );
    return certs;
  } catch (error) {
    throw new ApiError(500, `Failed to load root CAs: ${error.message}`);
  }
};

const initializeVerifier = async () => {
  try {
    const appleRootCAs = await loadRootCAs();
    const enableOnlineChecks = true;
    const appAppleId = undefined;
    const environment =
      process.env.APPLE_API_ENV === "production"
        ? Environment.PRODUCTION
        : Environment.SANDBOX;

    const bundleId = process.env.APPLE_BUNDLE_ID;
    const verifier = new SignedDataVerifier(
      appleRootCAs,
      enableOnlineChecks,
      environment,
      bundleId,
      appAppleId
    );
    return verifier;
  } catch (error) {
    throw new ApiError(500, `Failed to initialize verifier: ${error.message}`);
  }
};

const getAllSubscriptionStatuses = async (req, res) => {
  try {
    validateParams(req.params, ["transactionId"]);
    if (!req.appleJwt) throw new ApiError(401, "Missing Apple JWT");

    try {
      try {
        const response = await makeAppleApiRequest(
          "get",
          `/inApps/v1/subscriptions/${req.params.transactionId}`,
          req.appleJwt
        );
        const data =
          response.data.data[0]?.lastTransactions[0]?.signedRenewalInfo;
        const decodedData = DecodeJWT(data);

        console.log(decodedData);
        res.json(
          new ApiResponse(
            200,
            decodedData,
            "Subscription statuses fetched successfully"
          )
        );
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json(error.message);
  }
};

module.exports = {
  getAllSubscriptionStatuses,
};
