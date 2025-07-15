const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const OrderModel = require("../models/Order.model");
const CartModel = require("../models/Cart.model");
const ProductModel = require("../models/Product.model");
const AddressModel = require("../models/Address.model");
const TiffinMenuModel = require("../models/TiffinMenu.model");

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
      selfPickup = false,
    } = req.body;

    if (!userId || !orderId || !cartId || !cartAmount || !paymentMethod) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Missing required fields: userId, cartId, orderId, paymentMethod, and cartAmount are required"
          )
        );
    }

    if (!addressId && !selfPickup) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Either addressId must be provided or selfPickup must be true"
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
        if (!product) {
          throw new Error(`Product not found for ID: ${item.product_id}`);
        }

        return {
          ...(item.toObject?.() || item),
          productDetails: product,
        };
      })
    );

    const tiffinItemsWithDetails = await Promise.all(
      (cart.tiffins || []).map(async (tiffin) => {
        const tiffinMenu = await TiffinMenuModel.findById(tiffin.tiffinMenuId);
        if (!tiffinMenu) {
          throw new Error(
            `Tiffin menu not found for ID: ${tiffin.tiffinMenuId}`
          );
        }

        return {
          ...(tiffin.toObject?.() || tiffin),
          tiffinMenuDetails: tiffinMenu,
        };
      })
    );

    const grandTotal = parseFloat(
      (Number(cartAmount) + Number(taxAmount)).toFixed(2)
    );

    const newOrder = await OrderModel.create({
      userId,
      cartId,
      orderId,
      addressId: addressId || "",
      paymentMethod,
      paymentStatus: "Paid",
      orderStatus: "Pending",
      deliveryTime: deliveryTime ? new Date(deliveryTime) : undefined,
      cartAmount,
      discount,
      deliveryFee,
      taxAmount,
      grandTotal,
      notes,
      selfPickup,
      cartItems: cartItemsWithProducts,
      tiffinItems: tiffinItemsWithDetails,
      Orderdate: new Date(),
    });

    await Promise.all(
      (cart.items || []).map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        if (!product || !product.manageInventory) return;

        if (item.sku?.skuId) {
          const updatedSkus = product.sku.map((sku) => {
            if (sku._id.toString() !== item.sku.skuId.toString()) return sku;

            const detailsObject =
              sku.details instanceof Map
                ? Object.fromEntries(sku.details.entries())
                : sku.details;

            const combinationsArray = detailsObject?.combinations || [];

            if (combinationsArray.length > 0 && item.combination) {
              const updatedCombinations = combinationsArray.map((combo) => {
                const isMatch = Object.entries(item.combination).every(
                  ([key, value]) => combo[key] === value
                );

                return {
                  ...combo,
                  Stock: isMatch
                    ? Math.max((combo.Stock || 0) - item.quantity, 0)
                    : combo.Stock,
                };
              });

              return {
                ...(sku.toObject?.() || sku),
                details: {
                  ...detailsObject,
                  combinations: updatedCombinations,
                },
              };
            } else {
              return {
                ...(sku.toObject?.() || sku),
                details: {
                  ...detailsObject,
                  Stock: Math.max(
                    (detailsObject?.Stock || 0) - item.quantity,
                    0
                  ),
                },
              };
            }
          });

          await ProductModel.findByIdAndUpdate(item.product_id, {
            $set: { sku: updatedSkus },
          });
        } else {
          await ProductModel.findByIdAndUpdate(
            item.product_id,
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
        }
      })
    );
``
    await CartModel.findByIdAndUpdate(cartId, {
      $set: {
        items: [],
        tiffins: [],
        totalAmount: 0,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(200, newOrder, "Order created successfully"));
  } catch (error) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json(new ApiError(500, error.message || "Internal server error"));
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
    const {
      startDate,
      endDate,
      specificDate,
      dateRange,
      orderStatus,
      orderId,
      orderFilters,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    if (orderId) {
      filter.orderId = orderId;
    }

    if (orderFilters === "product") {
      filter.cartItems = { $exists: true, $not: { $size: 0 } };
    } else if (orderFilters === "tiffin") {
      filter.tiffinItems = { $exists: true, $not: { $size: 0 } };
    }

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

    const total = await OrderModel.countDocuments(filter);

    const rawOrders = await OrderModel.find(filter)
      .sort({ Orderdate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const addressIds = rawOrders.map((order) => order.addressId).filter(Boolean);
    const addresses = await AddressModel.find({ _id: { $in: addressIds } }).lean();
    const addressMap = new Map(addresses.map((addr) => [addr._id.toString(), addr]));

    const orders = rawOrders.map((order) => ({
      ...order,
      address: addressMap.get(order.addressId?.toString()) || null,
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          success: true,
          total,
          page: String(page),
          limit: String(limit),
          pages: Math.ceil(total / limit),
          orders,
        },
        "Orders fetched successfully"
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
    const { orderStatus } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing user ID"));
    }

    const filter = { userId };
    if (orderStatus && orderStatus !== "All") {
      filter.orderStatus = orderStatus;
    }

    const orders = await OrderModel.find(filter).sort({ Orderdate: -1 });

    const ordersWithAddress = await Promise.all(
      orders.map(async (order) => {
        let addressData = null;
        if (order.addressId) {
          addressData = await AddressModel.findById(order.addressId);
        }
        return {
          ...order.toObject(),
          address: addressData,
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          ordersWithAddress,
          "User orders fetched successfully"
        )
      );
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
