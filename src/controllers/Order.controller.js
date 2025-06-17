const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const OrderModel = require("../models/Order.model");
const CartModel = require("../models/Cart.model");
const ProductModel = require("../models/Product.model");

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartId,
      orderId,
      addressId,
      paymentMethod,
      cartAmount,
      discount = 0,
      deliveryFee = 0,
      taxAmount = 0,
      notes = "",
      deliveryTime,
    } = req.body;

    if (
      !userId ||
      !orderId ||
      !cartId ||
      !addressId ||
      !cartAmount ||
      !paymentMethod
    ) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Missing required fields: userId, cartId, addressId, paymentMethod, and cartAmount are required"
          )
        );
    }

    const cart = await CartModel.findById(cartId);
    if (!cart) {
      return res.status(404).json(new ApiError(404, "Cart not found"));
    }

    const cartItemsWithProducts = await Promise.all(
      (cart.items || []).map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        return {
          ...(item.toObject?.() || item),
          productDetails: product || null,
        };
      })
    );

    const grandTotal = parseFloat(
      (Number(cartAmount || 0) + Number(taxAmount || 0)).toFixed(2)
    );

    const newOrder = await OrderModel.create({
      userId,
      cartId,
      orderId,
      addressId,
      paymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      deliveryTime: deliveryTime ? new Date(deliveryTime) : undefined,
      cartAmount,
      discount,
      deliveryFee,
      taxAmount,
      grandTotal,
      notes,
      cartItems: cartItemsWithProducts,
      Orderdate: new Date(),
    });

    await CartModel.findByIdAndUpdate(cartId, {
      $set: {
        items: [],
        tiffins: [],
        totalAmount: 0,
      },
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
    console.error("Get order by ID error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { startDate, endDate, specificDate, dateRange } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (startDate || endDate || specificDate || dateRange) {
      let dateFilter = {};
      const now = new Date();

      if (specificDate) {
        const date = new Date(specificDate);
        if (!isNaN(date)) {
          dateFilter = {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lte: new Date(date.setHours(23, 59, 59, 999)),
          };
        }
      } else if (startDate || endDate) {
        if (startDate) {
          const fromDate = new Date(startDate);
          if (!isNaN(fromDate)) dateFilter.$gte = fromDate;
        }
        if (endDate) {
          const toDate = new Date(endDate);
          if (!isNaN(toDate)) dateFilter.$lte = toDate;
        }
      } else if (dateRange) {
        switch (dateRange.toLowerCase()) {
          case "today":
            dateFilter = {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
            break;
          case "yesterday":
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateFilter = {
              $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
            };
            break;
          case "last7days":
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            dateFilter = {
              $gte: new Date(sevenDaysAgo.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
            break;
          case "thismonth":
            dateFilter = {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
            break;
        }
      }

      if (Object.keys(dateFilter).length > 0) {
        filter.Orderdate = dateFilter;
      }
    }

    const totalOrders = await OrderModel.countDocuments(filter);

    const orders = await OrderModel.find(filter)
      .sort({ Orderdate: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          currentPage: page,
          pageSize: limit,
          orders,
        },
        "Orders fetched with pagination"
      )
    );
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing user ID"));
    }

    const orders = await OrderModel.find({ userId }).sort({ Orderdate: -1 });

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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
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
        .json(
          new ApiError(
            400,
            `Invalid or missing order status. Allowed statuses are: ${allowedStatuses.join(
              ", "
            )}`
          )
        );
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
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
            `Cannot cancel an order that is already '${order.orderStatus}'`
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
