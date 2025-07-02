// middleware/appleClientMiddleware.js
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const issuerId = process.env.APPLE_ISSUER_ID;
const keyId = process.env.APPLE_KEY_ID;

const privateKey = fs.readFileSync(
  path.join(__dirname, "../config/keys/SubscriptionKey_2TA77URG59.p8"),
  "utf8"
);

function createJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
    bid: process.env.APPLE_BUNDLE_ID,
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: keyId,
      typ: "JWT",
    },
  });

  return token;
}

function appleClientMiddleware(req, res, next) {
  try {
    const token = createJWT();
    req.appleJwt = token;
    next();
  } catch (err) {
    console.error("JWT creation failed:", err);
    res.status(500).json({ error: "Failed to generate Apple JWT token" });
  }
}

module.exports = appleClientMiddleware;
