const Wishlist = require('../../models/Wishlist');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');

// GET /api/users/wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.userId })
      .populate({
        path: 'products',
        select: 'name images price discount reviews isActive isDeleted',
        match: { isDeleted: false, isActive: true }
      });

    if (!wishlist) {
      return res.status(200).json({ products: [] });
    }

    // Remove any null products (blocked/deleted since being wishlisted)
    wishlist.products = wishlist.products.filter(p => p !== null);

    res.status(200).json({ products: wishlist.products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/wishlist/:productId - add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not available' });
    }

    let wishlist = await Wishlist.findOne({ user: req.userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.userId, products: [] });
    }

    // Check if already in wishlist
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: 'Already in wishlist' });
    }

    wishlist.products.push(productId);
    await wishlist.save();

    res.status(200).json({ message: 'Added to wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/wishlist/:productId - remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    await Wishlist.updateOne(
      { user: req.userId },
      { $pull: { products: productId } }
    );

    res.status(200).json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/wishlist - clear entire wishlist
exports.clearWishlist = async (req, res) => {
  try {
    await Wishlist.updateOne(
      { user: req.userId },
      { $set: { products: [] } }
    );

    res.status(200).json({ message: 'Wishlist cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/wishlist/move-all-to-cart
exports.moveAllToCart = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.userId })
      .populate('products');

    if (!wishlist || wishlist.products.length === 0) {
      return res.status(400).json({ message: 'Wishlist is empty' });
    }

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    let addedCount = 0;

    for (const product of wishlist.products) {
      if (!product || product.isDeleted || !product.isActive || product.stock <= 0) {
        continue; // skip unavailable/out of stock products
      }

      const existingIndex = cart.items.findIndex(
        item => item.product.toString() === product._id.toString()
      );

      if (existingIndex > -1) {
        // Already in cart — skip
        continue;
      }

      cart.items.push({
        product: product._id,
        quantity: 1,
        price: product.price
      });
      addedCount++;
    }

    await cart.save();

    // Clear wishlist after moving
    wishlist.products = [];
    await wishlist.save();

    res.status(200).json({
      message: `${addedCount} item(s) moved to cart`,
      addedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};