const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CartModel = require("../models/Cart.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ProductModel = require("../models/Product.model");
const mongoose = require("mongoose");

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

    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        return {
          ...item.toObject(),
          productDetails: product ? product.toObject() : null,
        };
      })
    );

    const tiffinsWithDetails = await Promise.all(
      cart.tiffins.map(async (tiffin) => {
        const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId);
        return {
          ...tiffin.toObject(),
          tiffinMenuDetails: tiffinMenu ? tiffinMenu.toObject() : null,
        };
      })
    );

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
      skuId,
      combination,
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
        totalAmount: 0,
      });
    }

    if (isTiffinCart) {
      if (!tiffinMenuId || !customizedItems || !orderDate || !day) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required tiffin fields"));
      }

      const tiffinTotal = customizedItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseFloat(item.quantity || 1);
        return sum + itemPrice * itemQuantity;
      }, 0);

      const tiffinQuantity = parseInt(quantity) || 1;

      const tiffinIndex = cart.tiffins.findIndex(
        (t) =>
          t.tiffinMenuId === tiffinMenuId &&
          t.day === day &&
          t.orderDate === orderDate
      );

      if (tiffinIndex > -1) {
        cart.tiffins[tiffinIndex].quantity += tiffinQuantity;
        cart.tiffins[tiffinIndex].totalAmount = (
          tiffinTotal * cart.tiffins[tiffinIndex].quantity
        ).toString();
      } else {
        cart.tiffins.push({
          tiffinMenuId,
          customizedItems,
          specialInstructions: specialInstructions || "",
          orderDate,
          day,
          quantity: tiffinQuantity,
          totalAmount: (tiffinTotal * tiffinQuantity).toString(),
        });
      }
    } else {
      if (!product_id || !quantity || !price) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing required product fields"));
      }

      const parsedQuantity = parseInt(quantity);
      const parsedPrice = parseFloat(price);

      const product = await ProductModel.findById(product_id);
      if (!product) {
        return res.status(404).json(new ApiError(404, "Product not found"));
      }

      const isUsingSku =
        skuId && skuId !== "null" && skuId !== "undefined" && skuId !== "";

      if (isUsingSku) {
        if (!mongoose.isValidObjectId(skuId)) {
          return res.status(400).json(new ApiError(400, "Invalid SKU ID"));
        }

        const sku = product.sku.find((s) => s._id.toString() === skuId);
        if (!sku) {
          return res.status(404).json(new ApiError(404, "SKU not found"));
        }

        const skuDetails = sku.details || new Map();
        const combinations = skuDetails.get("combinations") || [];
        const skuImages =
          skuDetails.get("SKUImages") || product.images.map((img) => img.url);

        const cleanCombination = { ...combination };
        delete cleanCombination.Price;

        const matchedCombination = combinations.find((comb) =>
          Object.keys(cleanCombination).every(
            (key) => comb[key] == cleanCombination[key]
          )
        );

        if (!matchedCombination) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid SKU combination"));
        }

        if (
          matchedCombination.Stock !== undefined &&
          parsedQuantity > matchedCombination.Stock
        ) {
          return res
            .status(400)
            .json(new ApiError(400, "Quantity exceeds SKU stock"));
        }

        if (
          matchedCombination.Price !== undefined &&
          parsedPrice !== matchedCombination.Price
        ) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Price mismatch: expected ${matchedCombination.Price}`
              )
            );
        }

        // Check if SKU item already in cart
        const itemIndex = cart.items.findIndex((item) => {
          const isSameProduct =
            item.product_id.toString() === product_id.toString();
          const isSameSku = item.sku?.skuId?.toString() === skuId;
          const isSameCombination =
            JSON.stringify(item.combination) ===
            JSON.stringify(cleanCombination);
          return isSameProduct && isSameSku && isSameCombination;
        });

        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += parsedQuantity;
        } else {
          cart.items.push({
            product_id,
            quantity: parsedQuantity,
            price: parsedPrice,
            combination: cleanCombination,
            sku: {
              skuId: sku._id,
              name: skuDetails.get("Name") || product.name,
              skuName: skuDetails.get("SKUname") || product.SKUName,
              images: skuImages,
            },
          });
        }
      } else {
        if (product.stock !== null && parsedQuantity > product.stock) {
          return res
            .status(400)
            .json(
              new ApiError(400, "Requested quantity exceeds available stock")
            );
        }

        itemIndex = cart.items.findIndex(
          (item) =>
            item.product_id.toString() === product_id.toString() &&
            (!item.sku || !item.sku.skuId)
        );

        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += parsedQuantity;
        } else {
          cart.items.push({
            product_id,
            quantity: parsedQuantity,
            price: parsedPrice,
            sku: null,
            combination: {},
          });
        }
      }
    }

    const productTotal = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    const tiffinTotal = cart.tiffins.reduce(
      (sum, tiffin) => sum + parseFloat(tiffin.totalAmount || 0),
      0
    );
    cart.totalAmount = productTotal + tiffinTotal;

    await cart.save();
    const rawCart = await CartModel.findById(cart._id).lean();

    const itemsWithProductDetails = await Promise.all(
      rawCart.items.map(async (item) => {
        const product = await ProductModel.findById(item.product_id).lean();
        return {
          ...item,
          productDetails: product || null,
        };
      })
    );

    const cartWithProductDetails = {
      ...rawCart,
      items: itemsWithProductDetails,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cartWithProductDetails,
          "Cart updated successfully"
        )
      );
  } catch (error) {
    console.error("Error in addToCart:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const updateCart = async (req, res) => {
  try {
    const { user_id, product_id, skuId, tiffinMenuId, day, quantity, type } =
      req.body;

    if (
      quantity === undefined ||
      quantity === null ||
      !type ||
      !["product", "tiffin"].includes(type)
    ) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Valid quantity and type ('product' or 'tiffin') are required"
          )
        );
    }

    let cart = await CartModel.findOne({ user: user_id });

    if (!cart) {
      return res.status(404).json(new ApiError(404, "Cart not found"));
    }

    if (type === "product") {
      if (!product_id && !skuId) {
        return res
          .status(400)
          .json(new ApiError(400, "Product ID or SKU ID is required"));
      }

      let itemIndex = -1;
      if (skuId) {
        itemIndex = cart.items.findIndex(
          (item) => item.sku?.skuId?.toString() === skuId
        );
      } else {
        itemIndex = cart.items.findIndex(
          (item) => item.product_id.toString() === product_id
        );
      }

      if (itemIndex === -1) {
        return res
          .status(404)
          .json(new ApiError(404, "Product not found in cart"));
      }

      if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = parseInt(quantity);
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
        tiffin.quantity = parseInt(quantity);

        const basePrice = tiffin.customizedItems.reduce((sum, item) => {
          return (
            sum + parseFloat(item.price || 0) * parseFloat(item.quantity || 1)
          );
        }, 0);

        tiffin.totalAmount = (basePrice * quantity).toFixed(2);
      }
    }

    const productTotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const tiffinTotal = cart.tiffins.reduce(
      (sum, t) => sum + parseFloat(t.totalAmount || 0),
      0
    );

    cart.totalAmount = productTotal + tiffinTotal;

    await cart.save();

    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        return {
          ...item.toObject(),
          productDetails: product ? product.toObject() : null,
        };
      })
    );

    const tiffinsWithDetails = await Promise.all(
      cart.tiffins.map(async (tiffin) => {
        const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId);
        return {
          ...tiffin.toObject(),
          tiffinMenuDetails: tiffinMenu ? tiffinMenu.toObject() : null,
        };
      })
    );

    const enrichedCart = {
      ...cart.toObject(),
      items: itemsWithDetails,
      tiffins: tiffinsWithDetails,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, enrichedCart, "Cart updated successfully"));
  } catch (error) {
    console.error("Error in updateCart:", error);
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
