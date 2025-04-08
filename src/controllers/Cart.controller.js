const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CartModel = require("../models/Cart.model");

const getUserCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const cart = await CartModel.findOne({ user: user_id });

    if (!cart) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: user_id,
            items: [],
            tiffins: [],
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
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const addToCart = async (req, res) => {
  try {
    const {
      user_id,
      isTiffinCart,
      product_id,
      quantity,
      price,
      tiffinMenuId,
      customizedItems,
      specialInstructions,
      orderDate,
      day,
    } = req.body;

    if (!user_id) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    let cart = await CartModel.findOne({ user: user_id });

    if (!cart) {
      cart = new CartModel({
        user: user_id,
        items: [],
        tiffins: [],
        totalAmount: "0",
      });
    }

    // Handle Tiffin
    if (isTiffinCart) {
      if (!tiffinMenuId || !customizedItems || !orderDate || !day) {
        return res.status(400).json(new ApiError(400, "Missing tiffin data"));
      }

      const tiffinTotal = customizedItems.reduce((sum, item) => {
        return (
          sum + parseFloat(item.price || 0) * parseFloat(item.quantity || 1)
        );
      }, 0);

      cart.tiffins.push({
        tiffinMenuId,
        customizedItems,
        specialInstructions: specialInstructions || "",
        orderDate,
        day,
        quantity: quantity || 1,
        totalAmount: (tiffinTotal * (quantity || 1)).toFixed(2),
      });
    }
    // Handle Product
    else {
      if (!product_id || !quantity || !price) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing fields for product cart item"));
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product === product_id
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += Number(quantity);
      } else {
        cart.items.push({ product: product_id, quantity, price });
      }
    }

    // Calculate total amount
    const productTotal = cart.items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tiffinTotal = cart.tiffins.reduce(
      (sum, t) => sum + parseFloat(t.totalAmount || 0),
      0
    );

    cart.totalAmount = (productTotal + tiffinTotal).toFixed(2);

    await cart.save();

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart updated successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const updateCart = async (req, res) => {
  try {
    const {
      user_id,
      product_id,
      tiffinMenuId,
      day,
      quantity,
      type, // 'product' or 'tiffin'
    } = req.body;

    if (!user_id || quantity == null || !type) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "user_id, quantity, and type ('product' or 'tiffin') are required"
          )
        );
    }

    let cart = await CartModel.findOne({ user: user_id });

    if (!cart) {
      return res.status(404).json(new ApiError(404, "Cart not found"));
    }

    if (type === "product") {
      if (!product_id) {
        return res
          .status(400)
          .json(new ApiError(400, "Product ID is required"));
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product === product_id
      );

      if (itemIndex === -1) {
        return res
          .status(404)
          .json(new ApiError(404, "Product not found in cart"));
      }

      if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    } else if (type === "tiffin") {
      if (!tiffinMenuId || !day) {
        return res
          .status(400)
          .json(new ApiError(400, "Tiffin menu ID and day are required"));
      }

      const tiffinIndex = cart.tiffins.findIndex(
        (t) => t.tiffinMenuId === tiffinMenuId && t.day === day
      );

      if (tiffinIndex === -1) {
        return res
          .status(404)
          .json(new ApiError(404, "Tiffin not found in cart"));
      }

      if (quantity === 0) {
        cart.tiffins.splice(tiffinIndex, 1);
      } else {
        const tiffin = cart.tiffins[tiffinIndex];
        tiffin.quantity = quantity;

        const basePrice = tiffin.customizedItems.reduce((sum, item) => {
          return (
            sum + parseFloat(item.price || 0) * parseFloat(item.quantity || 1)
          );
        }, 0);

        tiffin.totalAmount = (basePrice * quantity).toFixed(2);
      }
    } else {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid type. Must be 'product' or 'tiffin'"));
    }

    // Recalculate total cart amount
    const productTotal = cart.items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    const tiffinTotal = cart.tiffins.reduce(
      (sum, t) => sum + parseFloat(t.totalAmount || 0),
      0
    );

    cart.totalAmount = (productTotal + tiffinTotal).toFixed(2);

    await cart.save();

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart updated successfully"));
  } catch (error) {
    console.error(error);
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