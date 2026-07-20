const Order = require('../../models/Order');
const Product = require('../../models/Product');

// GET /api/admin/orders - list all orders with filters
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const payment = req.query.payment || '';
    const search = req.query.search || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter
    const filter = {};

    if (status) filter.status = status;
    if (payment) filter.paymentMethod = payment;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include the full end date
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })   // newest first
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

// GET /api/admin/orders/:id - single order detail
exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load order details' });
  }
};

// PUT /api/admin/orders/:id/status - change order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Prevent changing status of already cancelled orders
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot update a cancelled order' });
    }

    const previousStatus = order.status;
    order.status = status;

    // If admin cancels — restore stock
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      for (const item of order.items) {
        if (item.status === 'Active') {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
          );
          item.status = 'Cancelled';
        }
      }
    }

    // If delivered — update deliveredAt timestamp
    if (status === 'Delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();
    res.status(200).json({ message: `Order status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// GET /api/admin/orders/export - export as CSV
exports.exportOrders = async (req, res) => {
  try {
    const status = req.query.status || '';
    const payment = req.query.payment || '';
    const search = req.query.search || '';

    const filter = {};
    if (status) filter.status = status;
    if (payment) filter.paymentMethod = payment;
    if (search) filter.orderId = { $regex: search, $options: 'i' };

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Build CSV content
    const rows = [
      ['Order ID', 'Customer', 'Email', 'Amount', 'Payment', 'Status', 'Date']
    ];

    orders.forEach(o => {
      rows.push([
        o.orderId,
        o.user?.name || 'Unknown',
        o.user?.email || '',
        o.totalAmount,
        o.paymentMethod,
        o.status,
        new Date(o.createdAt).toLocaleDateString('en-IN')
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
};

// PUT /api/admin/orders/:id/approve-return
exports.approveReturn = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.items.forEach(item => {
      if (item.status === 'Return Requested') {
        item.status = 'Returned';
      }
    });

    order.status = 'Cancelled';
    await order.save();

    res.status(200).json({ message: 'Return approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to approve return' });
  }
};