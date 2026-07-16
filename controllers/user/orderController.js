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