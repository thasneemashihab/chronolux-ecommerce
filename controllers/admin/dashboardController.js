const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');

exports.getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate, category, brand, status } = req.query;

    const filter = { status: { $ne: 'Cancelled' } };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (status) filter.status = status;

    // Top-level stats
    const totalOrders = await Order.countDocuments(filter);
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalProducts = await Product.countDocuments({ isDeleted: false });
    const revenueAgg = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Revenue overview — grouped by month (for chart)
    const revenueByMonth = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Orders overview — status breakdown (donut chart)
    const statusBreakdown = await Order.aggregate([
      { $match: { createdAt: filter.createdAt || { $exists: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Best-selling products (Top 10)
    const bestProducts = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $match: { 'items.status': 'Active' } },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.itemTotal' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Best-selling categories (Top 10)
    const bestCategories = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $match: { 'items.status': 'Active' } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo._id',
          name: { $first: '$categoryInfo.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.itemTotal' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Best-selling brands (Top 10)
    const bestBrands = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $match: { 'items.status': 'Active' } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'brands',
          localField: 'productInfo.brand',
          foreignField: '_id',
          as: 'brandInfo'
        }
      },
      { $unwind: '$brandInfo' },
      {
        $group: {
          _id: '$brandInfo._id',
          name: { $first: '$brandInfo.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.itemTotal' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
      revenueByMonth,
      statusBreakdown,
      bestProducts,
      bestCategories,
      bestBrands
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
};