const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const User = require('../../models/User');

// GET /api/users/orders/checkout-data
exports.getCheckoutData = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        select: 'name images price stock isActive isDeleted discount'
      });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const validItems = cart.items.filter(item =>
      item.product &&
      !item.product.isDeleted &&
      item.product.isActive
    );

    if (validItems.length === 0) {
      return res.status(400).json({ message: 'No available products in cart' });
    }

    for (const item of validItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          message: `Only ${item.product.stock} units of "${item.product.name}" are available`
        });
      }
    }

    const user = await User.findById(req.userId).select('addresses name');

    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = validItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (item.product.discount || 0) / 100);
    }, 0);
    const shippingCharge = subtotal > 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = Math.round(subtotal - discount + shippingCharge + tax);

    res.status(200).json({
      items: validItems,
      addresses: user.addresses,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      shippingCharge,
      tax,
      totalAmount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load checkout data. Please try again.' });
  }
};

// POST /api/users/orders/place
exports.placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod = 'COD', couponDiscount = 0, couponCode = '' } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: 'Please select a delivery address' });
    }

    const user = await User.findById(req.userId);
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Selected address not found' });
    }

    const cart = await Cart.findOne({ user: req.userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const validItems = cart.items.filter(item =>
      item.product && !item.product.isDeleted && item.product.isActive
    );

    if (validItems.length === 0) {
      return res.status(400).json({ message: 'No available products in cart' });
    }

    for (const item of validItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          message: `Sorry, only ${item.product.stock} units of "${item.product.name}" are now available`
        });
      }
    }

    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = validItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (item.product.discount || 0) / 100);
    }, 0);
    const shippingCharge = subtotal > 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.05);
    const couponDiscountAmount = Number(couponDiscount) || 0;
    const totalAmount = Math.round(subtotal - discount - couponDiscountAmount + shippingCharge + tax);

    const orderItems = validItems.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.images[0],
      price: item.price,
      quantity: item.quantity,
      itemTotal: item.price * item.quantity
    }));

    const orderId = 'CLX-' + Date.now().toString().slice(-7);

    const order = await Order.create({
      user: req.userId,
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        fullAddress: address.fullAddress,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        label: address.label
      },
      paymentMethod,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      couponDiscount: couponDiscountAmount,
      couponCode,
      shippingCharge,
      tax,
      totalAmount,
      orderId
    });

    // Reduce stock for each ordered product
    for (const item of validItems) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: order.orderId,
      orderDbId: order._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to place order. Please try again.' });
  }
};

// GET /api/users/orders/:orderId
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || order.user.toString() !== req.userId.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load order details' });
  }
};

// GET /api/users/orders - list all orders for logged in user
exports.getUserOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const status = req.query.status || '';
    const search = req.query.search || '';

    // Build filter
    const filter = { user: req.userId };
    if (status) filter.status = status;
    if (search) {
      filter.orderId = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })   // latest orders first
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalOrders: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
};

// PUT /api/users/orders/:orderId/cancel - cancel entire order
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Can only cancel Pending or Processing orders
    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel an order that is already ${order.status}`
      });
    }

    // Cancel all items and restore stock
    for (const item of order.items) {
      if (item.status === 'Active') {
        item.status = 'Cancelled';
        item.cancelReason = reason || '';

        // Restore stock for this product
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
    }

    order.status = 'Cancelled';
    order.cancelReason = reason || '';
    await order.save();

    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

// PUT /api/users/orders/:orderId/cancel-item/:itemId - cancel specific item
exports.cancelOrderItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel items in this order status' });
    }

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status === 'Cancelled') {
      return res.status(400).json({ message: 'Item already cancelled' });
    }

    item.status = 'Cancelled';
    item.cancelReason = reason || '';

    // Restore stock for this specific item
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );

    // Check if all items cancelled — if so, cancel the whole order
    const allCancelled = order.items.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
    }

    await order.save();
    res.status(200).json({ message: 'Item cancelled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel item' });
  }
};

// PUT /api/users/orders/:orderId/return - return order (only when Delivered)
exports.returnOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Reason is required for return requests' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Can only return Delivered orders
    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    order.status = 'Cancelled';  // treat return as cancelled for simplicity
    order.returnReason = reason;

    order.items.forEach(item => {
      if (item.status === 'Active') {
        item.status = 'Return Requested';
        item.returnReason = reason;
      }
    });

    await order.save();
    res.status(200).json({ message: 'Return request submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit return request' });
  }
};