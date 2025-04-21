const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CartModel = require("../models/Cart.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ProductModel = require("../models/Product.model");

const getUserCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: userId,
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

    // Fetch product details for items
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        return {
          ...item.toObject(),
          productDetails: product ? product.toObject() : null,
        };
      })
    );

    // Fetch tiffin menu details for tiffins
    const tiffinsWithDetails = await Promise.all(
      cart.tiffins.map(async (tiffin) => {
        const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId);
        return {
          ...tiffin.toObject(),
          tiffinMenuDetails: tiffinMenu ? tiffinMenu.toObject() : null,
        };
      })
    );

    // Create updated cart object with enriched data
    const enrichedCart = {
      ...cart.toObject(),
      items: itemsWithDetails,
      tiffins: tiffinsWithDetails,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, enrichedCart, "Cart retrieved successfully"));
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

    // Validate user_id
    if (!user_id) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    // Find or create cart
    let cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      cart = new CartModel({
        user: user_id,
        items: [],
        tiffins: [],
        totalAmount: "0.00",
      });
    }

    // Handle Tiffin
    if (isTiffinCart) {
      if (!tiffinMenuId || !customizedItems || !orderDate || !day) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required tiffin fields"));
      }

      // Validate customizedItems
      if (!Array.isArray(customizedItems) || customizedItems.length === 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid customized items"));
      }

      const tiffinTotal = customizedItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseFloat(item.quantity || 1);
        return (
          sum +
          (isNaN(itemPrice) ? 0 : itemPrice) *
            (isNaN(itemQuantity) ? 1 : itemQuantity)
        );
      }, 0);

      const tiffinQuantity = parseInt(quantity) || 1;
      if (tiffinQuantity <= 0) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid tiffin quantity"));
      }

      cart.tiffins.push({
        tiffinMenuId,
        customizedItems,
        specialInstructions: specialInstructions || "",
        orderDate,
        day,
        quantity: tiffinQuantity,
        totalAmount: (tiffinTotal * tiffinQuantity).toFixed(2),
      });
    }
    // Handle Product
    else {
      if (!product_id || !quantity || !price) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required product fields"));
      }

      const parsedQuantity = parseInt(quantity);
      const parsedPrice = parseFloat(price);

      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json(new ApiError(400, "Invalid quantity"));
      }
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json(new ApiError(400, "Invalid price"));
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product_id === product_id
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += parsedQuantity;
      } else {
        cart.items.push({
          product_id,
          quantity: parsedQuantity,
          price: parsedPrice.toFixed(2),
        });
      }
    }

    // Calculate total amount
    const productTotal = cart.items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price);
      return sum + (isNaN(itemPrice) ? 0 : itemPrice) * item.quantity;
    }, 0);

    const tiffinTotal = cart.tiffins.reduce((sum, tiffin) => {
      const tiffinAmount = parseFloat(tiffin.totalAmount);
      return sum + (isNaN(tiffinAmount) ? 0 : tiffinAmount);
    }, 0);

    cart.totalAmount = (productTotal + tiffinTotal).toFixed(2);

    await cart.save();

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart updated successfully"));
  } catch (error) {
    console.error("Cart update error:", error);
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
        (item) => item.product_id === product_id
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

    const enrichedCart = {
      ...cart.toObject(),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, enrichedCart, "Cart updated successfully"));
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

// Add tiffin data

// {
//   "user_id": "6615abcd1234ef5678901234",
//   "isTiffinCart": true,
//   "tiffinMenuId": "60d5f483f88b2c001c8e4b1a",
//   "customizedItems": [
//     {
//       "itemId": "67fdec791eae78c63cbbdbdf",
//       "name": "Aloo Gobi",
//       "price": "150.00",
//       "quantity": 1
//     }
//   ],
//   "specialInstructions": "No onions, please.",
//   "orderDate": "2025-04-16",
//   "day": "Tuesday",
//   "quantity": 1,
//   "price": "350.00"
// }
