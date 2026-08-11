const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Wishlist = require('../../models/Wishlist');

const MAX_QTY_PER_PRODUCT = 5; // change this one value to update limit everywhere

// GET /api/users/cart-get current user's cart
exports.getCart = async (req, res) => {
  try {
    // Find cart and populate product details for display
    let cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        select: 'name images price stock isActive isDeleted discount'
      });

    if (!cart) {
      return res.status(200).json({ items: [], subtotal: 0, discount: 0, total: 0, itemCount: 0 });
    }

    // Stage 3: Auto-clean blocked/deleted products from cart
    const removedItems = [];
    const validItems = cart.items.filter(item => {
      if (!item.product || item.product.isDeleted || !item.product.isActive) {
        removedItems.push(item.product?.name || 'A product');
        return false;
      }
      return true;
    });

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Also cap quantities that exceed current stock
    let stockAdjusted = false;
    for (const item of validItems) {
      if (item.quantity > item.product.stock) {
        item.quantity = item.product.stock;
        stockAdjusted = true;
      }
    }
    if (stockAdjusted) {
      await cart.save();
    }
    // Calculate order summary
    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = validItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (item.product.discount || 0) / 100);
    }, 0);
    const total = subtotal - discount;

    res.status(200).json({
      items: validItems,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      total: Math.round(total),
      itemCount: validItems.length,
      removedItems, // tell frontend which items were auto-removed
      stockAdjusted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load cart. Please try again.' });
  }
};

// POST /api/users/cart - add product to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, selectedColor } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Stage 1: Check product exists and is available
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true
    });

   // Stage 1 — Add to cart stock validation
if (selectedColor) {
  const colorVariant = product.colorVariants?.find(cv => cv.color === selectedColor);
  const colorStock = colorVariant?.stock || 0;

  if (colorStock <= 0) {
    return res.status(400).json({
      message: `"${product.name}" in ${selectedColor} color is currently out of stock`
    });
  }
  if (quantity > colorStock) {
    return res.status(400).json({
      message: `Only ${colorStock} units of "${product.name}" (${selectedColor}) available`
    });
  }
  if (quantity > MAX_QTY_PER_PRODUCT) {
    return res.status(400).json({
      message: `Maximum ${MAX_QTY_PER_PRODUCT} units per product allowed`
    });
  }
} else {
  if (product.stock <= 0) {
    return res.status(400).json({
      message: `"${product.name}" is currently out of stock`
    });
  }
  if (quantity > product.stock) {
    return res.status(400).json({
      message: `Only ${product.stock} units of "${product.name}" available`
    });
  }
}

    // Step 3: Find or create cart for this user
    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }
     // Step 4: Check if product already in cart
    const existingIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      // Product already in cart — increase quantity
      const newQty = cart.items[existingIndex].quantity + quantity;

      // Stage 1: Check max limit
      if (newQty > MAX_QTY_PER_PRODUCT) {
        return res.status(400).json({
          message: `Maximum ${MAX_QTY_PER_PRODUCT} units of "${product.name}" allowed per order`
        });
      }

      // Stage 1: Check stock against new total quantity
      if (newQty > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} units of "${product.name}" available in stock`
        });
      }

      cart.items[existingIndex].quantity = newQty;
    } else {

      if (quantity > MAX_QTY_PER_PRODUCT) {
        return res.status(400).json({
          message: `Maximum ${MAX_QTY_PER_PRODUCT} units per product allowed`
        });
      }
      if (quantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} units of "${product.name}" available in stock`
        });
      }

      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }

    await cart.save();

    // Auto-remove from wishlist
    await Wishlist.updateOne(
      { user: req.userId },
      { $pull: { products: productId } }
    );

    res.status(200).json({
      message: `${product.name} added to cart`,
      itemCount: cart.items.length
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product' });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to add to cart. Please try again.' });
  }
};

// PUT /api/users/cart/:productId - update quantity
exports.updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    // Validate quantity is a positive number
    if (quantity === undefined || quantity === null || isNaN(quantity)) {
      return res.status(400).json({ message: 'Please enter a valid quantity' });
    }

    const qty = parseInt(quantity);

    if (qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Stage 2: Check product still available
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true
    }).select('name stock isActive isDeleted');

    if (!product) {
      return res.status(404).json({
        message: 'This product is no longer available and has been removed from your cart'
      });
    }

    // Stage 2: Check max limit
    if (qty > MAX_QTY_PER_PRODUCT) {
      return res.status(400).json({
        message: `Maximum ${MAX_QTY_PER_PRODUCT} units of "${product.name}" allowed per order`
      });
    }

    // Stage 2: Check against current stock
    if (qty > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} units of "${product.name}" are currently available`
      });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    item.quantity = qty;
    await cart.save();

    res.status(200).json({ message: 'Quantity updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update quantity. Please try again.' });
  }
};

// DELETE /api/users/cart/:productId  - remove one item
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
      // $pull removes the matching item from the array
    const itemExists = cart.items.some(i => i.product.toString() === productId);
    if (!itemExists) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.status(200).json({
      message: 'Item removed from cart',
      itemCount: cart.items.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove item. Please try again.' });
  }
};