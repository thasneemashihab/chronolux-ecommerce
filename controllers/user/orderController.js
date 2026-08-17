const crypto=require('crypto');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const User = require('../../models/User');
const razorpayInstance = require('../../config/razorpay');
const Wallet = require('../../models/Wallet');
const { creditWallet, debitWallet } = require('../../utils/walletHelper');


// GET /api/users/orders/checkout-data — Stage 4
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

  

    // Stage 4: Filter blocked/deleted products
    const unavailableItems = [];
    const validItems = cart.items.filter(item => {
      if (!item.product || item.product.isDeleted || !item.product.isActive) {
        unavailableItems.push(item.product?.name || 'Unknown product');
        return false;
      }
      return true;
    });

    if (unavailableItems.length > 0) {
      // Clean them from cart automatically
      const cart2 = await Cart.findOne({ user: req.userId });
      cart2.items = cart2.items.filter(item => {
        return validItems.some(vi => vi.product._id.toString() === item.product.toString());
      });
      await cart2.save();

      return res.status(400).json({
        message: `Some products are no longer available and have been removed from your cart: ${unavailableItems.join(', ')}. Please review your cart.`
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ message: 'No available products in cart' });
    }

    // Stage 4: Check stock for every item
    const stockErrors = [];
    for (const item of validItems) {
      if (item.product.stock <= 0) {
        stockErrors.push(`"${item.product.name}" is out of stock`);
      } else if (item.quantity > item.product.stock) {
        stockErrors.push(`Only ${item.product.stock} units of "${item.product.name}" available (you have ${item.quantity} in cart)`);
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        message: `Stock issue: ${stockErrors[0]}. Please update your cart.`
      });
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



// POST /api/users/orders/place — Stage 5
exports.placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod = 'COD', couponDiscount = 0, couponCode = '',
      razorpayOrderId,razorpayPaymentId,razorpaySignature
     } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: 'Please select a delivery address' });
    }

    //verify payment signature if this is an online payment
    if(paymentMethod==='Online'){
      if(!razorpayOrderId|| !razorpayPaymentId|| !razorpaySignature){
        return res.status(400).json({message:'Payment verification data missing'});
      }

      const generatedSignature=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

      if(generatedSignature !== razorpaySignature){
        return res.status(400).json({message:'Payment verification failed.Please try again.'});
      }
    }

    const user = await User.findById(req.userId);
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Selected address not found. Please select a valid address.' });
    }

    const cart = await Cart.findOne({ user: req.userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // Stage 5: Final availability check
    const unavailable = [];
    const validItems = cart.items.filter(item => {
      if (!item.product || item.product.isDeleted || !item.product.isActive) {
        unavailable.push(item.product?.name || 'A product');
        return false;
      }
      return true;
    });

    if (unavailable.length > 0) {
      return res.status(400).json({
        message: `Cannot place order. These products are no longer available: ${unavailable.join(', ')}. Please remove them from your cart.`
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ message: 'No available products in cart' });
    }

    // Stage 5: Final stock check for every item- Place order (final validation)
   
    for (const item of validItems) {
    if (item.selectedColor) {
    // Validate per-color stock
    const freshProduct = await Product.findById(item.product._id);
    const colorVariant = freshProduct.colorVariants?.find(cv => cv.color === item.selectedColor);
    const colorStock = colorVariant?.stock || 0;

    if (colorStock <= 0) {
      return res.status(400).json({
        message: `"${item.product.name}" in ${item.selectedColor} just went out of stock. Please update your cart.`
      });
    }
    if (item.quantity > colorStock) {
      return res.status(400).json({
        message: `Only ${colorStock} units of "${item.product.name}" (${item.selectedColor}) are now available. You ordered ${item.quantity}.`
      });
    }
  } else {
    if (item.product.stock <= 0) {
      return res.status(400).json({
        message: `"${item.product.name}" is out of stock. Please remove it from your cart.`
      });
    }
    if (item.quantity > item.product.stock) {
      return res.status(400).json({
        message: `Only ${item.product.stock} units of "${item.product.name}" available. You ordered ${item.quantity}.`
      });
    }
  }
}

    // Calculate totals
    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = validItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (item.product.discount || 0) / 100);
    }, 0);
    const shippingCharge = subtotal > 1999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.05);
    const couponDiscountAmount = Number(couponDiscount) || 0;
    const totalAmount = Math.round(subtotal - discount - couponDiscountAmount + shippingCharge + tax);

     // ⬇️ INSERT THE NEW WALLET CHECK RIGHT HERE — after totalAmount is calculated, BEFORE Order.create() ⬇️
    if (paymentMethod === 'Wallet') {
      const wallet = await Wallet.findOne({ user: req.userId });
      if (!wallet || wallet.balance < totalAmount) {
        return res.status(400).json({ message: 'Insufficient wallet balance. Please choose another payment method.' });
      }
    }
    
    // Build order items snapshot
    const orderItems = validItems.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.images[0],
      price: item.price,
      quantity: item.quantity,
      itemTotal: item.price * item.quantity
    }));

    const orderId = 'ORD-' + Date.now().toString().slice(-7);

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
      paymentStatus:paymentMethod==='Online' ? 'Paid':'Pending',
      razorpayOrderId:razorpayOrderId || '',
      razorpayPaymentId:razorpayPaymentId || '',
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      couponDiscount: couponDiscountAmount,
      couponCode,
      shippingCharge,
      tax,
      totalAmount,
      orderId
    });


    // Actually debit the wallet now that the order exists
if (paymentMethod === 'Wallet') {
  await debitWallet(
    req.userId,
    totalAmount,
    `Payment for order #${order.orderId}`,
    order._id
  );
}


    // After order is created, reduce stock
    for (const item of validItems) {
       const selectedColor = item.selectedColor; // we need to pass this from cart
      
  if (selectedColor) {
    // Reduce specific color stock AND total stock
     await Product.findOneAndUpdate(
      {
        _id: item.product._id,
        'colorVariants.color': selectedColor
      },
      {
        $inc: {
          'colorVariants.$.stock': -item.quantity,  // reduce color-specific stock
          stock: -item.quantity                      // reduce total stock
        }
      }
    );
  } else {
    // No color selected — reduce only total stock
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }
  }

    // Clear cart
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

    // NEW: handle refund for online payments
    //...inside cancelOrder, replace the refund block
    if (order.paymentMethod === 'Online' && order.paymentStatus === 'Paid') {
      order.paymentStatus = 'Refunded';
      // In production: await razorpayInstance.payments.refund(order.razorpayPaymentId, { amount: order.totalAmount * 100 });
      await creditWallet(
      order.user,
       order.totalAmount,
        `Refund for cancelled order #${order.orderId}`,
       order._id
      );
    }

    await order.save();

    res.status(200).json({
      message: order.paymentMethod === 'Online' && order.paymentStatus === 'Refunded'
        ? 'Order cancelled successfully. Your refund will be processed shortly.'
        : 'Order cancelled successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

// PUT /api/users/orders/:orderId/return - return entire order
exports.returnOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Please provide a reason for the return request' });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    order.items.forEach(item => {
      if (item.status === 'Active') {
        item.status = 'Return Requested';
        item.returnReason = reason.trim();
      }
    });

    order.returnReason = reason.trim();
    await order.save();

    res.status(200).json({ message: 'Return request submitted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit return request. Please try again.' });
  }
};


// PUT /api/users/orders/:orderId/cancel-item/:itemId
exports.cancelOrderItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
     // Can only cancel items in Pending or Processing orders
    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel items in an order that is ${order.status}`
      });
    }

    // Find the specific item
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in this order' });
    }
    if (item.status === 'Cancelled') {
      return res.status(400).json({ message: 'This item is already cancelled' });
    }
    if (item.status !== 'Active') {
      return res.status(400).json({ message: `Cannot cancel item with status: ${item.status}` });
    }

    // Cancel this specific item
    item.status = 'Cancelled';
    item.cancelReason = reason || 'No reason provided';

    // Restore stock for this item only
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );


    // NEW: refund this item's amount to wallet, if it was an online payment
    let refundIssued = false;
    if (order.paymentMethod === 'Online' && order.paymentStatus === 'Paid') {
      refundIssued = true;
      await creditWallet(
        order.user,
        item.itemTotal,
        `Refund for cancelled item "${item.name}" — order #${order.orderId}`,
        order._id
      );
    }

    // Check if ALL items are now cancelled — if so cancel whole order
    const allCancelled = order.items.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
      order.cancelReason = 'All items cancelled by customer';
      if (order.paymentMethod === 'Online' && order.paymentStatus === 'Paid') {
        order.paymentStatus = 'Refunded';
      }
    }

    await order.save();

    res.status(200).json({
      message: refundIssued
        ? `"${item.name}" has been cancelled. ₹${item.itemTotal.toLocaleString()} refunded to your wallet.`
        : `"${item.name}" has been cancelled successfully`,
      allOrderCancelled: allCancelled
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel item. Please try again.' });
  }
};

// PUT /api/users/orders/:orderId/return-item/:itemId
exports.returnOrderItem = async (req, res) => {
  try {
    const { reason } = req.body;

    // Return reason is mandatory
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Please provide a reason for the return request' });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Can only return items from Delivered orders
    if (order.status !== 'Delivered') {
      return res.status(400).json({
        message: 'Only delivered orders can be returned'
      });
    }

     const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in this order' });
    }
    if (item.status === 'Return Requested') {
      return res.status(400).json({ message: 'Return already requested for this item' });
    }
    if (item.status === 'Returned') {
      return res.status(400).json({ message: 'This item has already been returned' });
    }
    if (item.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot return a cancelled item' });
    }
    if (item.status !== 'Active') {
      return res.status(400).json({ message: `Cannot request return for item with status: ${item.status}` });
    }

    item.status = 'Return Requested';
    item.returnReason = reason.trim();

    await order.save();

    res.status(200).json({
      message: `Return request submitted for "${item.name}". We'll process it shortly.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit return request. Please try again.' });
  }
};

//POST /api/users/orders/create-razorpay-order
exports.createRazorpayOrder=async (req,res)=>{
  try{
    const {amount }=req.body; //amount in rupees

    if(!amount || isNaN(amount) || Number(amount) <= 0){
      return res.status(400).json({message :'Invalid amount'});
    }

    const options={
      amount : Math.round(Number(amount)* 100), //Razor needs paise , not rupees
      currency : 'INR',
      receipt : 'receipt_' + Date.now()
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    res.status(200).json({
     orderId : razorpayOrder.id,
     amount : razorpayOrder.amount,
     currency : razorpayOrder.currency,
     keyId : process.env.RAZORPAY_KEY_ID
    });
  } catch (err){
    console.error(err);
    res.status(500).json({ message:'Failed to create payment order'});
  }
};