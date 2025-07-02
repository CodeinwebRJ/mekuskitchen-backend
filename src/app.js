const express = require("express");
const cors = require("cors");
const path = require("path");
const ProductRoute = require("./routes/Product.route");
const ReviewRoute = require("./routes/Review.route");
const CartRoute = require("./routes/Cart.route");
const AddressRoute = require("./routes/Address.route");
const OrderRoute = require("./routes/Order.route");
const TiffinMenuRoute = require("./routes/TiffinMenu.route");
const ContactRoute = require("./routes/Contact.route");
const WishlistRoute = require("./routes/Wishlist.route");
const CountRoute = require("./routes/Count.route");
const CouponRoute = require("./routes/Coupon.route");
const TaxRoute = require("./routes/Tax.Route");
const PaymentRoute = require("./routes/Payment.route");
const AdminUserRoute = require("./routes/AdminUser.model");
const ShippingRoute = require("./routes/Shipping.route");
const CategoriesRoute = require("./routes/Categories.route");
const SubscriptionStatusesRoute = require("./routes/et-world-SubscriptionStatuses.route");
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
app.use("/api/v1/address", AddressRoute);
app.use("/api/v1/order", OrderRoute);
app.use("/api/v1/tiffin-menu", TiffinMenuRoute);
app.use("/api/v1/contact", ContactRoute);
app.use("/api/v1/wishlist", WishlistRoute);
app.use("/api/v1/C", CountRoute);
app.use("/api/v1/coupon", CouponRoute);
app.use("/api/v1/tax", TaxRoute);
app.use("/api/v1/payment", PaymentRoute);
app.use("/api/v1/admin", AdminUserRoute);
app.use("/api/v1/shipping", ShippingRoute);
app.use("/api/v1/categories", CategoriesRoute);
app.use("/api/v1/sub", SubscriptionStatusesRoute);


module.exports = app;
