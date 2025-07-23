const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const CartModel = require("../models/Cart.model");
const TiffinModel = require("../models/TiffinMenu.model");
const ProductModel = require("../models/Product.model");
const TaxModel = require("../models/Tax.model");
const mongoose = require("mongoose");

const formatUserCart = async (cart, provinceCode) => {
  let taxConfig = null;
  if (provinceCode) {
    taxConfig = await TaxModel.findOne({ provinceCode });
  }

  let totalAmount = 0;
  let totalFederalTax = 0;
  let totalProvinceTax = 0;

  const itemsWithDetails = await Promise.all(
    cart.items.map(async (item) => {
      const product = await ProductModel.findById(item.product_id).lean();
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      const itemSubtotal = price * quantity;

      let itemFederalTax = 0;
      let itemProvinceTax = 0;

      if (product?.category && !product?.isTaxFree && taxConfig?.taxes) {
        const categoryTax = taxConfig.taxes.find(
          (t) => t.category === product.category
        );
        if (categoryTax) {
          itemFederalTax = (itemSubtotal * categoryTax.federalTax) / 100;
          itemProvinceTax = (itemSubtotal * categoryTax.provinceTax) / 100;
        }
      }

      totalAmount += itemSubtotal;
      totalFederalTax += itemFederalTax;
      totalProvinceTax += itemProvinceTax;

      return {
        ...item.toObject(),
        productDetails: product || null,
        itemTax: (itemFederalTax + itemProvinceTax).toFixed(2),
      };
    })
  );

  const tiffinsWithDetails = await Promise.all(
    cart.tiffins.map(async (tiffin) => {
      const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId).lean();
      const tiffinTotal = parseFloat(tiffin.totalAmount || 0);

      let tiffinFederalTax = 0;
      let tiffinProvinceTax = 0;

      if (
        tiffinMenu?.taxCategory &&
        !tiffinMenu?.isTaxFree &&
        taxConfig?.taxes
      ) {
        const categoryTax = taxConfig.taxes.find(
          (t) => t.category === tiffinMenu.taxCategory
        );
        if (categoryTax) {
          tiffinFederalTax = (tiffinTotal * categoryTax.federalTax) / 100;
          tiffinProvinceTax = (tiffinTotal * categoryTax.provinceTax) / 100;
        }
      }

      totalAmount += tiffinTotal;
      totalFederalTax += tiffinFederalTax;
      totalProvinceTax += tiffinProvinceTax;

      return {
        ...tiffin.toObject(),
        tiffinMenuDetails: tiffinMenu || null,
        tiffinTax: (tiffinFederalTax + tiffinProvinceTax).toFixed(2),
      };
    })
  );

  const totalTax = totalFederalTax + totalProvinceTax;
  const discount = parseFloat(cart.discount || 0);
  const grandTotal = totalAmount - discount;

  return {
    ...cart.toObject(),
    items: itemsWithDetails,
    tiffins: tiffinsWithDetails,
    totalAmount: totalAmount.toFixed(2),
    totalFederalTax: totalFederalTax.toFixed(2),
    totalProvinceTax: totalProvinceTax.toFixed(2),
    totalTax: totalTax.toFixed(2),
    discount: discount.toFixed(2),
    discountType: cart.discountType || null,
    couponCode: cart.couponCode || null,
    grandTotal: grandTotal.toFixed(2),
  };
};

const getUserCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { provinceCode } = req.query;

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
            totalAmount: "0.00",
            totalFederalTax: "0.00",
            totalProvinceTax: "0.00",
            totalTax: "0.00",
            discount: "0.00",
            discountType: null,
            couponCode: null,
            grandTotal: "0.00",
            createdAt: null,
            updatedAt: null,
          },
          "No cart found for this user"
        )
      );
    }

    let taxConfig = null;
    if (provinceCode) {
      taxConfig = await TaxModel.findOne({ provinceCode });
    }

    let totalAmount = 0;
    let totalFederalTax = 0;
    let totalProvinceTax = 0;

    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ProductModel.findById(item.product_id);
        const productDetails = product ? product.toObject() : null;

        const price = parseFloat(item.price || 0);
        const quantity = parseInt(item.quantity || 1);
        const itemSubtotal = price * quantity;

        let itemFederalTax = 0;
        let itemProvinceTax = 0;

        if (
          productDetails?.category &&
          !productDetails?.isTaxFree && // 🔥 Skip tax if isTaxFree is true
          taxConfig?.taxes
        ) {
          const categoryTax = taxConfig.taxes.find(
            (t) => t.category === productDetails.category
          );

          if (categoryTax) {
            itemFederalTax = (itemSubtotal * categoryTax.federalTax) / 100;
            itemProvinceTax = (itemSubtotal * categoryTax.provinceTax) / 100;
          }
        }

        totalAmount += itemSubtotal;
        totalFederalTax += itemFederalTax;
        totalProvinceTax += itemProvinceTax;

        return {
          ...item.toObject(),
          productDetails,
          itemTax: (itemFederalTax + itemProvinceTax).toFixed(2),
        };
      })
    );

    const tiffinsWithDetails = await Promise.all(
      cart.tiffins.map(async (tiffin) => {
        const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId);
        const tiffinMenuDetails = tiffinMenu ? tiffinMenu.toObject() : null;

        const tiffinTotal = parseFloat(tiffin.totalAmount || 0);

        let tiffinFederalTax = 0;
        let tiffinProvinceTax = 0;

        if (
          tiffinMenuDetails?.taxCategory &&
          !tiffinMenuDetails?.isTaxFree && // 🔥 Same check for tiffins (if applicable)
          taxConfig?.taxes
        ) {
          const categoryTax = taxConfig.taxes.find(
            (t) => t.category === tiffinMenuDetails.taxCategory
          );

          if (categoryTax) {
            tiffinFederalTax = (tiffinTotal * categoryTax.federalTax) / 100;
            tiffinProvinceTax = (tiffinTotal * categoryTax.provinceTax) / 100;
          }
        }

        totalAmount += tiffinTotal;
        totalFederalTax += tiffinFederalTax;
        totalProvinceTax += tiffinProvinceTax;

        return {
          ...tiffin.toObject(),
          tiffinMenuDetails,
          tiffinTax: (tiffinFederalTax + tiffinProvinceTax).toFixed(2),
        };
      })
    );

    const totalTax = totalFederalTax + totalProvinceTax;
    const discount = parseFloat(cart.discount || 0);
    const grandTotal = totalAmount - discount;

    const enrichedCart = {
      ...cart.toObject(),
      items: itemsWithDetails,
      tiffins: tiffinsWithDetails,
      totalAmount: totalAmount.toFixed(2),
      totalFederalTax: totalFederalTax.toFixed(2),
      totalProvinceTax: totalProvinceTax.toFixed(2),
      totalTax: totalTax.toFixed(2),
      discount: discount.toFixed(2),
      discountType: cart.discountType || null,
      couponCode: cart.couponCode || null,
      grandTotal: grandTotal.toFixed(2),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, enrichedCart, "Cart retrieved successfully"));
  } catch (error) {
    console.error("getUserCart error:", error);
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
      deliveryDate,
      specialInstructions,
      orderDate,
      day,
    } = req.body;

    const provinceCode = req.query.provinceCode || null;

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
      if (
        !tiffinMenuId ||
        !Array.isArray(customizedItems) ||
        customizedItems.length === 0 ||
        !orderDate ||
        !day
      ) {
        return res
          .status(400)
          .json(new ApiError(400, "Missing or invalid tiffin fields"));
      }

      const tiffinQuantity = parseInt(quantity || 1);

      const singleTiffinTotal = customizedItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQty = parseInt(item.quantity || 1);
        return sum + itemPrice * itemQty;
      }, 0);

      const totalTiffinAmount = (singleTiffinTotal * tiffinQuantity).toFixed(2);

      const simplifiedNewItems = customizedItems
        .map((item) => ({
          name: item.name?.trim(),
          quantity: parseInt(item.quantity),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const matchingIndex = cart.tiffins.findIndex((t) => {
        if (
          t.tiffinMenuId !== tiffinMenuId ||
          t.day !== day ||
          t.orderDate !== orderDate ||
          t.deliveryDate !== deliveryDate
        )
          return false;

        const simplifiedExisting = t.customizedItems
          .map((item) => ({
            name: item.name?.trim(),
            quantity: parseInt(item.quantity),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (simplifiedExisting.length !== simplifiedNewItems.length)
          return false;

        return simplifiedExisting.every((item, i) => {
          return (
            item.name === simplifiedNewItems[i].name &&
            item.quantity === simplifiedNewItems[i].quantity
          );
        });
      });

      if (matchingIndex !== -1) {
        const existing = cart.tiffins[matchingIndex];
        existing.quantity += tiffinQuantity;
        existing.totalAmount = (singleTiffinTotal * existing.quantity).toFixed(
          2
        );
      } else {
        cart.tiffins.push({
          tiffinMenuId,
          customizedItems,
          specialInstructions: specialInstructions || "",
          orderDate,
          day,
          deliveryDate: deliveryDate || "",
          quantity: tiffinQuantity,
          totalAmount: totalTiffinAmount,
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
        delete cleanCombination.Stock;

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

        const itemIndex = cart.items.findIndex(
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

    const finalCart = await formatUserCart(cart, provinceCode);

    return res
      .status(200)
      .json(new ApiResponse(200, finalCart, "Cart updated successfully"));
  } catch (error) {
    console.error("Error in addToCart:", error);
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
      skuId,
      tiffinMenuId,
      day,
      quantity,
      type,
      customizedItems,
      combination,
    } = req.body;
    const { provinceCode } = req.query;

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

    const isSameCombination = (a = {}, b = {}) => {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => a[key] === b[key]);
    };

    if (type === "product") {
      if (!product_id && !skuId) {
        return res
          .status(400)
          .json(new ApiError(400, "Product ID or SKU ID is required"));
      }

      const itemIndex = cart.items.findIndex((item) => {
        const sameProduct = item.product_id.toString() === product_id;
        const sameSku = skuId ? item.sku?.skuId?.toString() === skuId : true;
        const sameCombination = isSameCombination(
          item.combination,
          combination || {}
        );
        return sameProduct && sameSku && sameCombination;
      });

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

      if (!Array.isArray(customizedItems) || customizedItems.length === 0) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Customized items are required for tiffin update")
          );
      }

      const simplifiedNewItems = customizedItems
        .map((item) => ({
          name: item.name?.trim(),
          quantity: parseInt(item.quantity),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const tiffinIndex = cart.tiffins.findIndex((t) => {
        if (
          t.tiffinMenuId !== tiffinMenuId ||
          t.day !== day ||
          !Array.isArray(t.customizedItems)
        )
          return false;

        const simplifiedExisting = t.customizedItems
          .map((item) => ({
            name: item.name?.trim(),
            quantity: parseInt(item.quantity),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (simplifiedExisting.length !== simplifiedNewItems.length)
          return false;

        return simplifiedExisting.every(
          (item, i) =>
            item.name === simplifiedNewItems[i].name &&
            item.quantity === simplifiedNewItems[i].quantity
        );
      });

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
          const itemPrice = parseFloat(item.price || 0);
          const itemQty = parseFloat(item.quantity || 1);
          return sum + itemPrice * itemQty;
        }, 0);

        tiffin.totalAmount = parseFloat(
          (basePrice * tiffin.quantity).toFixed(2)
        );
      }
    }

    if (cart.items.length === 0 && cart.tiffins.length === 0) {
      cart.couponCode = null;
      cart.discountType = null;
      cart.discountValue = 0;
      cart.discount = 0;
    }

    let taxConfig = null;
    if (provinceCode) {
      taxConfig = await TaxModel.findOne({ provinceCode });
    }

    let totalAmount = 0;
    let totalFederalTax = 0;
    let totalProvinceTax = 0;

    for (const item of cart.items) {
      const product = await ProductModel.findById(item.product_id);
      const subtotal = item.price * item.quantity;
      totalAmount += subtotal;

      if (product?.category && taxConfig) {
        const tax = taxConfig.taxes.find(
          (t) => t.category === product.category
        );
        if (tax) {
          totalFederalTax += (subtotal * tax.federalTax) / 100;
          totalProvinceTax += (subtotal * tax.provinceTax) / 100;
        }
      }
    }

    for (const tiffin of cart.tiffins) {
      const tiffinMenu = await TiffinModel.findById(tiffin.tiffinMenuId);
      const tiffinSubtotal = parseFloat(tiffin.totalAmount || "0");
      totalAmount += tiffinSubtotal;

      if (tiffinMenu?.taxCategory && taxConfig) {
        const tax = taxConfig.taxes.find(
          (t) => t.category === tiffinMenu.taxCategory
        );
        if (tax) {
          totalFederalTax += (tiffinSubtotal * tax.federalTax) / 100;
          totalProvinceTax += (tiffinSubtotal * tax.provinceTax) / 100;
        }
      }
    }

    const totalTax = totalFederalTax + totalProvinceTax;

    let discount = 0;
    if (cart.couponCode && cart.discountType && cart.discountValue) {
      if (cart.discountType === "percentage") {
        discount = (totalAmount * cart.discountValue) / 100;
      } else if (cart.discountType === "fixed") {
        discount = cart.discountValue;
      }
    }

    const grandTotal = totalAmount + totalTax - discount;

    cart.totalAmount = parseFloat(totalAmount.toFixed(2));
    cart.totalFederalTax = parseFloat(totalFederalTax.toFixed(2));
    cart.totalProvinceTax = parseFloat(totalProvinceTax.toFixed(2));
    cart.totalTax = parseFloat(totalTax.toFixed(2));
    cart.discount = parseFloat(discount.toFixed(2));
    cart.grandTotal = parseFloat(grandTotal.toFixed(2));

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
      totalAmount: cart.totalAmount.toFixed(2),
      totalFederalTax: cart.totalFederalTax.toFixed(2),
      totalProvinceTax: cart.totalProvinceTax.toFixed(2),
      totalTax: cart.totalTax.toFixed(2),
      discount: cart.discount.toFixed(2),
      discountType: cart.discountType || null,
      discountValue: cart.discountValue || 0,
      couponCode: cart.couponCode || null,
      grandTotal: cart.grandTotal.toFixed(2),
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

const bulkUploadProductCart = async (req, res) => {
  try {
    const { user_id, items } = req.body;
    const provinceCode = req.query.provinceCode || null;

    if (!user_id) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Items array is required and cannot be empty"));
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

    for (const item of items) {
      const { product_id, quantity, price, skuId, combination } = item;

      if (!product_id || !quantity || !price) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Missing required fields for product ${product_id || "unknown"}`
            )
          );
      }

      const parsedQuantity = parseInt(quantity);
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedQuantity) || parsedQuantity < 1) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Invalid quantity for product ${product_id}: ${quantity}`
            )
          );
      }
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Invalid price for product ${product_id}: ${price}`
            )
          );
      }

      const product = await ProductModel.findById(product_id);
      if (!product) {
        return res
          .status(404)
          .json(new ApiError(404, `Product not found: ${product_id}`));
      }

      let cleanCombination = {};
      let skuDetails = null;
      let skuImages = product.images.map((img) => img.url);

      const isUsingSku =
        skuId && skuId !== "null" && skuId !== "undefined" && skuId !== "";

      if (isUsingSku) {
        if (!mongoose.isValidObjectId(skuId)) {
          return res
            .status(400)
            .json(new ApiError(400, `Invalid SKU ID: ${skuId}`));
        }

        const selectedSku = product.sku.find((s) => s._id.toString() === skuId);
        if (!selectedSku) {
          return res
            .status(404)
            .json(new ApiError(404, `SKU not found: ${skuId}`));
        }

        skuDetails = selectedSku.details || new Map();
        const combinations = skuDetails.get("combinations") || [];
        skuImages = skuDetails.get("SKUImages") || skuImages;

        cleanCombination = { ...combination };
        delete cleanCombination.Price;
        delete cleanCombination.Stock;

        const matchedCombination = combinations.find((comb) =>
          Object.keys(cleanCombination).every(
            (key) => comb[key] == cleanCombination[key]
          )
        );

        if (!matchedCombination) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Invalid SKU combination for SKU ${skuId}: ${JSON.stringify(
                  cleanCombination
                )}`
              )
            );
        }

        if (
          matchedCombination.Stock !== undefined &&
          parsedQuantity > matchedCombination.Stock
        ) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Quantity exceeds SKU stock for ${product_id}, SKU ${skuId}`
              )
            );
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
                `Price mismatch for ${product_id}, SKU ${skuId}: expected ${matchedCombination.Price}`
              )
            );
        }
      } else {
        if (product.stock !== null && parsedQuantity > product.stock) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Quantity exceeds available stock for ${product_id}`
              )
            );
        }
      }

      const itemIndex = cart.items.findIndex((cartItem) => {
        const isSameProduct = cartItem.product_id.toString() === product_id;
        const isSameSku = isUsingSku
          ? cartItem.sku?.skuId?.toString() === skuId
          : !cartItem.sku || !cartItem.sku.skuId;
        const isSameCombination =
          JSON.stringify(cartItem.combination) ===
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
          sku: isUsingSku
            ? {
                skuId,
                name: skuDetails.get("Name") || product.name,
                skuName: skuDetails.get("SKUname") || product.SKUName,
                images: skuImages,
              }
            : null,
        });
      }
    }

    const productTotal = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    cart.totalAmount = productTotal;
    await cart.save();
    const finalCart = await formatUserCart(cart, provinceCode);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          finalCart,
          "Cart updated successfully with bulk upload"
        )
      );
  } catch (error) {
    console.error("Error in bulkUploadCart:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const bulkUploadTiffinCart = async (req, res) => {
  try {
    const { user_id, tiffins } = req.body;
    const provinceCode = req.query.provinceCode || null;

    if (!user_id) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }
    if (!Array.isArray(tiffins) || tiffins.length === 0) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Tiffins array is required and cannot be empty")
        );
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

    for (const tiffin of tiffins) {
      const {
        tiffinMenuId,
        day,
        deliveryDate,
        orderDate,
        customizedItems,
        quantity,
        price,
        specialInstructions,
      } = tiffin;

      if (
        !tiffinMenuId ||
        !day ||
        !orderDate ||
        !Array.isArray(customizedItems) ||
        customizedItems.length === 0
      ) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Missing required fields for tiffin ${tiffinMenuId || "unknown"}`
            )
          );
      }

      const parsedQuantity = parseInt(quantity);
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedQuantity) || parsedQuantity < 1) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Invalid quantity for tiffin ${tiffinMenuId}: ${quantity}`
            )
          );
      }
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Invalid price for tiffin ${tiffinMenuId}: ${price}`
            )
          );
      }

      for (const item of customizedItems) {
        const { name, price: itemPrice, quantity: itemQuantity } = item;
        if (!name || !itemPrice || !itemQuantity) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Missing required fields in customizedItems for tiffin ${tiffinMenuId}`
              )
            );
        }
        const parsedItemPrice = parseFloat(itemPrice);
        const parsedItemQuantity = parseInt(itemQuantity);
        if (isNaN(parsedItemPrice) || parsedItemPrice < 0) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Invalid price in customizedItems for tiffin ${tiffinMenuId}: ${itemPrice}`
              )
            );
        }
        if (isNaN(parsedItemQuantity) || parsedItemQuantity < 1) {
          return res
            .status(400)
            .json(
              new ApiError(
                400,
                `Invalid quantity in customizedItems for tiffin ${tiffinMenuId}: ${itemQuantity}`
              )
            );
        }
      }

      const tiffinMenu = await TiffinModel.findById(tiffinMenuId);
      if (!tiffinMenu) {
        return res
          .status(404)
          .json(new ApiError(404, `Tiffin menu not found: ${tiffinMenuId}`));
      }

      const singleTiffinTotal = customizedItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQty = parseInt(item.quantity || 1);
        return sum + itemPrice * itemQty;
      }, 0);

      const totalTiffinAmount = (singleTiffinTotal * parsedQuantity).toFixed(2);
      if (parseFloat(totalTiffinAmount) !== parsedPrice * parsedQuantity) {
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Price mismatch for tiffin ${tiffinMenuId}: expected ${totalTiffinAmount}, received ${parsedPrice}`
            )
          );
      }

      const simplifiedNewItems = customizedItems
        .map((item) => ({
          name: item.name?.trim(),
          quantity: parseInt(item.quantity),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const matchingIndex = cart.tiffins.findIndex((t) => {
        if (
          t.tiffinMenuId !== tiffinMenuId ||
          t.day !== day ||
          t.orderDate !== orderDate ||
          t.deliveryDate !== (deliveryDate || "")
        ) {
          return false;
        }

        const simplifiedExisting = t.customizedItems
          .map((item) => ({
            name: item.name?.trim(),
            quantity: parseInt(item.quantity),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (simplifiedExisting.length !== simplifiedNewItems.length) {
          return false;
        }

        return simplifiedExisting.every((item, i) => {
          return (
            item.name === simplifiedNewItems[i].name &&
            item.quantity === simplifiedNewItems[i].quantity
          );
        });
      });

      const formattedCustomizedItems = customizedItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: parseInt(item.quantity),
        weight: item.weight || "",
        weightUnit: item.weightUnit || "",
        description: item.description || "",
        included: true,
      }));

      if (matchingIndex !== -1) {
        cart.tiffins[matchingIndex].quantity += parsedQuantity;
        cart.tiffins[matchingIndex].totalAmount = (
          singleTiffinTotal * cart.tiffins[matchingIndex].quantity
        ).toFixed(2);
      } else {
        // Add new tiffin
        cart.tiffins.push({
          tiffinMenuId,
          customizedItems: formattedCustomizedItems,
          specialInstructions: specialInstructions || "",
          orderDate,
          day,
          deliveryDate: deliveryDate || "",
          quantity: parsedQuantity,
          totalAmount: totalTiffinAmount,
        });
      }
    }

    // Calculate total amount
    const tiffinTotal = cart.tiffins.reduce(
      (sum, tiffin) => sum + parseFloat(tiffin.totalAmount || 0),
      0
    );
    const productTotal = cart.items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    cart.totalAmount = (productTotal + tiffinTotal).toFixed(2);
    await cart.save();
    const finalCart = await formatUserCart(cart, provinceCode);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          finalCart,
          "Tiffin cart updated successfully with bulk upload"
        )
      );
  } catch (error) {
    console.error("Error in bulkUploadTiffinCart:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const areCustomizedItemsEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;

  const toIdSet = (arr) => new Set(arr.map((item) => item._id.toString()));
  const setA = toIdSet(a);
  const setB = toIdSet(b);
  return (
    [...setA].every((id) => setB.has(id)) &&
    [...setB].every((id) => setA.has(id))
  );
};

const UpdateTiffinItem = async (req, res) => {
  try {
    const { user_id, tiffinMenuId, day, customizedItems } = req.body;

    if (!user_id || !tiffinMenuId || !day || !Array.isArray(customizedItems)) {
      return res.status(400).json(new ApiError(400, "Missing required fields"));
    }

    const cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      return res.status(404).json(new ApiError(404, "Cart not found"));
    }

    const tiffinIndex = cart.tiffins.findIndex(
      (t) =>
        t.tiffinMenuId === tiffinMenuId &&
        t.day === day &&
        areCustomizedItemsEqual(t.customizedItems || [], customizedItems || [])
    );

    if (tiffinIndex === -1) {
      return res
        .status(404)
        .json(new ApiError(404, "Tiffin not found in cart"));
    }

    const tiffin = cart.tiffins[tiffinIndex];

    tiffin.customizedItems = tiffin.customizedItems.map((item) => {
      const match = customizedItems.find((ci) => ci.name === item.name);
      if (match) {
        return {
          ...item.toObject(),
          quantity: parseInt(match.quantity) || 1,
        };
      }
      return item;
    });

    const basePrice = tiffin.customizedItems.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const qty = parseFloat(item.quantity || 1);
      return sum + price * qty;
    }, 0);

    tiffin.totalAmount = parseFloat((basePrice * tiffin.quantity).toFixed(2));

    await cart.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tiffin,
          "Tiffin item quantities updated successfully"
        )
      );
  } catch (error) {
    console.error("UpdateTiffinItem Error:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// For Mobile APPS
const addToCartProduct = async (req, res) => {
  try {
    const { user_id, product_id, quantity, price, skuId, combination } =
      req.body;
    const provinceCode = req.query.provinceCode || null;

    if (!user_id || !product_id || !quantity || !price) {
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

    let cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      cart = new CartModel({
        user: user_id,
        items: [],
        tiffins: [],
        totalAmount: 0,
      });
    }

    const isUsingSku =
      skuId && skuId !== "null" && skuId !== "undefined" && skuId !== "";

    if (isUsingSku) {
      if (!mongoose.isValidObjectId(skuId)) {
        return res.status(400).json(new ApiError(400, "Invalid SKU ID"));
      }

      const sku = product.sku.find((s) => s._id.toString() === skuId);
      if (!sku) return res.status(404).json(new ApiError(404, "SKU not found"));

      const skuDetails = sku.details || new Map();
      const combinations = skuDetails.get("combinations") || [];
      const skuImages =
        skuDetails.get("SKUImages") || product.images.map((img) => img.url);

      const cleanCombination = { ...combination };
      delete cleanCombination.Price;
      delete cleanCombination.Stock;

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

      const itemIndex = cart.items.findIndex((item) => {
        const isSameProduct =
          item.product_id.toString() === product_id.toString();
        const isSameSku = item.sku?.skuId?.toString() === skuId;
        const isSameCombination =
          JSON.stringify(item.combination) === JSON.stringify(cleanCombination);
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

      const itemIndex = cart.items.findIndex(
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

    const finalCart = await formatUserCart(cart, provinceCode);
    return res
      .status(200)
      .json(new ApiResponse(200, finalCart, "Product added to cart"));
  } catch (error) {
    console.error("Error in addToCartProduct:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

const addToCartTiffin = async (req, res) => {
  try {
    const {
      user_id,
      tiffinMenuId,
      customizedItems,
      deliveryDate,
      specialInstructions,
      orderDate,
      day,
      quantity,
    } = req.body;

    const provinceCode = req.query.provinceCode || null;

    if (
      !user_id ||
      !tiffinMenuId ||
      !orderDate ||
      !day ||
      !Array.isArray(customizedItems) ||
      customizedItems.length === 0
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "Missing or invalid tiffin fields"));
    }

    const tiffinQuantity = parseInt(quantity || 1);

    const singleTiffinTotal = customizedItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price || 0);
      const itemQty = parseInt(item.quantity || 1);
      return sum + itemPrice * itemQty;
    }, 0);

    const totalTiffinAmount = (singleTiffinTotal * tiffinQuantity).toFixed(2);

    let cart = await CartModel.findOne({ user: user_id });
    if (!cart) {
      cart = new CartModel({
        user: user_id,
        items: [],
        tiffins: [],
        totalAmount: 0,
      });
    }

    const simplifiedNewItems = customizedItems
      .map((item) => ({
        name: item.name?.trim(),
        quantity: parseInt(item.quantity),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const matchingIndex = cart.tiffins.findIndex((t) => {
      if (
        t.tiffinMenuId !== tiffinMenuId ||
        t.day !== day ||
        t.orderDate !== orderDate ||
        t.deliveryDate !== deliveryDate
      )
        return false;

      const simplifiedExisting = t.customizedItems
        .map((item) => ({
          name: item.name?.trim(),
          quantity: parseInt(item.quantity),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (simplifiedExisting.length !== simplifiedNewItems.length) return false;

      return simplifiedExisting.every((item, i) => {
        return (
          item.name === simplifiedNewItems[i].name &&
          item.quantity === simplifiedNewItems[i].quantity
        );
      });
    });

    if (matchingIndex !== -1) {
      const existing = cart.tiffins[matchingIndex];
      existing.quantity += tiffinQuantity;
      existing.totalAmount = (singleTiffinTotal * existing.quantity).toFixed(2);
    } else {
      cart.tiffins.push({
        tiffinMenuId,
        customizedItems,
        specialInstructions: specialInstructions || "",
        orderDate,
        day,
        deliveryDate: deliveryDate || "",
        quantity: tiffinQuantity,
        totalAmount: totalTiffinAmount,
      });
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

    const finalCart = await formatUserCart(cart, provinceCode);
    return res
      .status(200)
      .json(new ApiResponse(200, finalCart, "Tiffin added to cart"));
  } catch (error) {
    console.error("Error in addToCartTiffin:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [error.message]));
  }
};

module.exports = {
  addToCart,
  getUserCart,
  updateCart,
  bulkUploadProductCart,
  bulkUploadTiffinCart,
  addToCartProduct,
  addToCartTiffin,
  UpdateTiffinItem,
};
