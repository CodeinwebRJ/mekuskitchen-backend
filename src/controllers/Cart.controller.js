const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CartModel = require("../models/Cart.model");

const getUserCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const cart = await CartModel.findOne({ user: user_id });

    if (!cart) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: user_id,
            items: [],
            totalAmount: "0",
            createdAt: null,
            updatedAt: null,
          },
          "No cart found for this user"
        )
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart retrieved successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const addToCart = async (req, res) => {
  try {
    const { product_id, user_id, totalAmount, quantity, price } = req.body;

    if (!product_id || !user_id || !quantity || !price) {
      return res.status(400).json(new ApiError(400, "Missing fields required"));
    }

    let cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      cart = await CartModel.create({
        user: user_id,
        items: [],
        totalAmount: "0",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product === product_id
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({ product: product_id, quantity, price });
    }

    cart.totalAmount = cart.items
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toString();

    await cart.save();

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Item added to cart successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
      });
    }
    console.log(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const updateCart = async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;

    if (!user_id || !product_id || !quantity) {
      return res
        .status(400)
        .json(
          new ApiError(400, "User ID, Product ID, and quantity are required")
        );
    }

    if (quantity < 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Quantity must be a non-negative integer"));
    }

    let cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      return res.status(404).json(new ApiError(404, "Cart not found"));
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === product_id.toString()
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json(new ApiError(404, "Product not found in cart"));
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
      cart.totalAmount = cart.items
        .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
        .toString();
      await cart.save();
      return res
        .status(200)
        .json(
          new ApiResponse(200, cart, "Product removed from cart successfully")
        );
    } else {
      cart.items[itemIndex].quantity = quantity;
      cart.totalAmount = cart.items
        .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
        .toString();
      await cart.save();
      return res
        .status(200)
        .json(new ApiResponse(200, cart, "Cart quantity updated successfully"));
    }
  } catch (error) {
    console.error("Cart update error:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

module.exports = {
  addToCart,
  getUserCart,
  updateCart,
};