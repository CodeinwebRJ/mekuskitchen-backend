const express = require("express");
const cors = require("cors");
const path = require("path");
const ProductRoute = require("./routes/Product.route");
const ReviewRoute = require("./routes/Review.route");
const CartRoute = require("./routes/Cart.route");
const AddressRoute = require("./routes/Address.route");
const OrderRoute = require("./routes/Order.route");
const TiffinMenuRoute = require("./routes/TiffinMenu.route");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/product", ProductRoute);
app.use("/api/v1/review", ReviewRoute);
app.use("/api/v1/cart", CartRoute);
app.use("/api/v1/address", AddressRoute)
app.use("/api/v1/order" , OrderRoute)
app.use("/api/v1/tiffin-menu" , TiffinMenuRoute)

module.exports = app;
