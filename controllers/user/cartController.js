const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Wishlist = require('../../models/Wishlist');

// GET /api/users/cart - get current user's cart
exports.getCart = async (req, res) => {
  try {
    // Find cart and populate product details for display
    let cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        select: 'name images price stock isActive isDeleted discount'
      });

    if (!cart) {
      return res.status(200).json({ items: [], subtotal: 0, discount: 0, total: 0 });
    }

    // Filter out items whose product was deleted or deactivated since being added
    const validItems = cart.items.filter(item =>
      item.product &&
      !item.product.isDeleted &&
      item.product.isActive
    );

    // If any invalid items were found, clean them from the cart
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Calculate order summary
    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = validItems.reduce((sum, item) => {
      const productDiscount = item.product.discount || 0;
      return sum + (item.price * item.quantity * productDiscount / 100);
    }, 0);
    const total = subtotal - discount;

    res.status(200).json({
      items: validItems,
      subtotal,
      discount: Math.round(discount),
      total: Math.round(total),
      itemCount: validItems.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/cart - add product to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    if (quantity < 1 || quantity > 5) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 5' });
    }

    // Step 1: Check product exists and is available
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({ message: 'This product is no longer available' });
    }

    // Step 2: Check stock availability (requirement vii)
    if (product.stock <= 0) {
      return res.status(400).json({ message: `${product.name} is currently out of stock` });
    }

    // Step 3: Find or create cart for this user
    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    // Step 4: Check if product already in cart (requirement iii)
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Product already in cart — increase quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Validate against stock and max limit (requirements v and vi)
      if (newQuantity > product.stock) {
        return res.status(400).json({ message: `Only ${product.stock}  units of "${product.name}" are available` });
      }
      if (newQuantity > 5) {
        return res.status(400).json({ message: `You can only add up to 5 units of "${product.name}" to your cart` });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // New product — add to cart
      if (quantity > product.stock) {
        return res.status(400).json({ message: `Only ${product.stock}  units of "${product.name}" are available` });
      }
      if (quantity > 5) {
        return res.status(400).json({ message: `You can only add up to 5 units of "${product.name}" to your cart` });
      }

      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }

    await cart.save();

    // Step 5: Remove from wishlist if present (requirement iv)
    await Wishlist.updateOne(
      { user: req.userId },
      { $pull: { products: productId } }
    );

    res.status(200).json({ message: 'Added to cart successfully', itemCount: cart.items.length });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product. Please try again.' });
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
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Check current stock
    const product = await Product.findById(productId).select('stock isActive isDeleted');
    if (!product || product.isDeleted || !product.isActive) {
      return res.status(404).json({ message: 'Product no longer available' });
    }

    // Enforce stock and max limits (requirements v and vi)
    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} items available in stock` });
    }
    if (quantity > 5) {
      return res.status(400).json({ message: 'Maximum 5 items per product allowed' });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not in cart' });

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ message: 'Quantity updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/cart/:productId - remove one item
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // $pull removes the matching item from the array
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};