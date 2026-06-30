const Product = require('../../models/Product');

// GET /api/admin/products
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {
      isDeleted: false,
      name: { $regex: search, $options: 'i' }
    };

    const products = await Product.find(filter)
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProducts: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/products/dropdowns - brand + category options for the form
exports.getProductDropdowns = async (req, res) => {
  try {
    const Category = require('../../models/Category');
    const Brand = require('../../models/Brand');

    const categories = await Category.find({ isDeleted: false }).select('name');
    const brands = await Brand.find({ isDeleted: false }).select('name');

    res.status(200).json({ categories, brands });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/admin/products - add new product
exports.addProduct = async (req, res) => {
  try {
    const { name, brand, category, description, price, stock } = req.body;

    if (!req.files || req.files.length < 3) {
      return res.status(400).json({ message: 'Please upload at least 3 product images' });
    }

    const imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);

    await Product.create({
      name, brand, category, description,
      price: Number(price),
      stock: Number(stock),
      images: imagePaths
    });

    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/products/:id - edit product
exports.updateProduct = async (req, res) => {
  try {
    const { name, brand, category, description, price, stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.name = name;
    product.brand = brand;
    product.category = category;
    product.description = description;
    product.price = Number(price);
    product.stock = Number(stock);

    if (req.files && req.files.length > 0) {
      if (req.files.length < 3) {
        return res.status(400).json({ message: 'Please upload at least 3 product images' });
      }
      product.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    await product.save();
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/products/:id/toggle-status - the green switch
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      message: product.isActive ? 'Product activated' : 'Product deactivated',
      isActive: product.isActive
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/products/:id - soft delete
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isDeleted = true;
    await product.save();

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};