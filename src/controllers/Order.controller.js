const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const OrderModel = require("../models/Order.model");
const { updateSearchIndex } = require("../models/Review.model");

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartId,
      addressId,
      paymentMethod,
      totalAmount,
      discount,
      deliveryFee,
      taxAmount,
      notes,
      deliveryTime,
    } = req.body;

    // Validate required fields
    if (!userId || !cartId || !addressId || !totalAmount) {
      return res.status(400).json(new ApiError(400, "Missing required fields"));
    }

    const newOrder = await OrderModel.create({
      userId,
      cartId,
      addressId,
      paymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      deliveryTime,
      totalAmount,
      discount,
      deliveryFee,
      taxAmount,
      notes,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newOrder, "Order created successfully"));
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing order ID"));
    }

    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json(new ApiError(404, "Order not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order fetched successfully"));
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

//get all for admin
const getAllOrders = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      specificDate,
      dateRange, // e.g., 'today', 'yesterday', 'last7days', 'thisMonth'
    } = req.body;

    let filter = {};

    if (startDate || endDate || specificDate || dateRange) {
      filter.Orderdate = {};

      // Specific date filter
      if (specificDate) {
        const date = new Date(specificDate);
        filter.Orderdate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lte: new Date(date.setHours(23, 59, 59, 999)),
        };
      }
      // Date range filter
      else if (startDate || endDate) {
        if (startDate) filter.Orderdate.$gte = new Date(startDate);
        if (endDate) filter.Orderdate.$lte = new Date(endDate);
      }
      // Predefined date ranges
      else if (dateRange) {
        const now = new Date();
        switch (dateRange.toLowerCase()) {
          case "today":
            filter.Orderdate = {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
            break;
          case "yesterday":
            const yesterday = new Date(now.setDate(now.getDate() - 1));
            filter.Orderdate = {
              $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
            };
            break;
          case "last7days":
            filter.Orderdate = {
              $gte: new Date(now.setDate(now.getDate() - 7)),
              $lte: new Date(),
            };
            break;
          case "thismonth":
            filter.Orderdate = {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lte: new Date(),
            };
            break;
          default:
            break;
        }
      }
    }

    const orders = await OrderModel.find(filter).sort({ Orderdate: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, orders, "All orders fetched successfully"));
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

// user order history
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!updateSearchIndex) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing user ID"));
    }

    const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No orders found for this user"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, orders, "User orders fetched successfully"));
  } catch (error) {
    console.error("Get user orders error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!id) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing order ID"));
    }

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing order status"));
    }

    const updatedOrder = await OrderModel.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json(new ApiError(404, "Order not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedOrder, "Order status updated successfully")
      );
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing order ID"));
    }

    const order = await OrderModel.findById(id);

    if (!order) {
      return res.status(404).json(new ApiError(404, "Order not found"));
    }

    if (["Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Cannot cancel an order that is already ${order.orderStatus}`
          )
        );
    }

    order.orderStatus = "Cancelled";
    const updatedOrder = await order.save();

    return res
      .status(200)
      .json(new ApiResponse(200, updatedOrder, "Order cancelled successfully"));
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  getOrdersByUser,
  updateOrderStatus,
  cancelOrder,
};
