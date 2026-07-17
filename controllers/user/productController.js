const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');

// GET /api/users/products - product listing with search, filter, sort, pagination
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sortBy = req.query.sort || 'newest';
    const categoryId = req.query.category || '';
    const brandId = req.query.brand || '';
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 9999999;

    // Base filter: only show active, non-deleted products
    const filter = {
      isDeleted: false,
      isActive: true,
      price: { $gte: minPrice, $lte: maxPrice }
    };

    if (search) filter.name = { $regex: search, $options: 'i' };
    if (categoryId) filter.category = categoryId;
    if (brandId) filter.brand = brandId;

    // Sort options matching your Figma dropdown
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceLow: { price: 1 },
      priceHigh: { price: -1 },
      nameAZ: { name: 1 },
      nameZA: { name: -1 }
    };
    const sort = sortOptions[sortBy] || sortOptions.newest;

    const products = await Product.find(filter)
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name brand category price originalPrice discount images stock isActive reviews');

    const total = await Product.countDocuments(filter);

    // Get categories with product counts for the filter sidebar
    const categories = await Category.find({ isDeleted: false, isListed: true }).select('name');
    const brands = await Brand.find({ isDeleted: false }).select('name');

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProducts: total,
      categories,
      brands
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/products/:id - single product details
exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: false,
      isActive: true
    })
      .populate('brand', 'name')
      .populate('category', 'name')
      .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    } 

    // Get related products from same category
     const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isDeleted: false,
      isActive: true
    })
      .limit(4)
      .populate('brand', 'name')
      .select('name price originalPrice discount images reviews brand');

    res.status(200).json({ product, relatedProducts });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/products/:id/review - add a review
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check if this user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === req.userId.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const User = require('../../models/User');
    const user = await User.findById(req.userId).select('name');

    product.reviews.push({
      user: req.userId,
      name: user.name,
      rating: Number(rating),
      comment
    });

    await product.save();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};