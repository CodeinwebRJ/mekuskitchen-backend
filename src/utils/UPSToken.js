const { default: axios } = require("axios");
const ApiError = require("./ApiError");

const getUPSToken = async () => {
  try {
    console.log(process.env.UPS_CLIENT_ID);
    console.log(process.env.UPS_CLIENT_SECRET);

    const credentials = Buffer.from(
      `${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
      "https://wwwcie.ups.com/security/v1/oauth/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    console.log(response.data);
    const { access_token } = response.data;

    return access_token;
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Failed to get UPS access token");
  }
};

module.exports = getUPSToken;
