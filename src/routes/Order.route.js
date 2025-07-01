const express = require("express");
const {
  createOrder,
  getOrderById,
  getAllOrders,
  getOrdersByUser,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/Order.controller");
const OrderRoute = express.Router();

OrderRoute.get("/admin/orders", getAllOrders);
OrderRoute.post("/", createOrder);
OrderRoute.post("/:id", getOrderById);
OrderRoute.get("/user/:userId", getOrdersByUser);
OrderRoute.put("/status/:id", updateOrderStatus);
OrderRoute.post("/cancel/:id", cancelOrder);

module.exports = OrderRoute;
