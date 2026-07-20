const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');

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
    const { name, brand, category, description, specifications,
            price, originalPrice, discount, stock, isActive, colors, variants } = req.body;

     // validation
     if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!brand) {
      return res.status(400).json({ message: 'Please select a brand' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Please select a category' });
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: 'Please enter a valid price greater than 0' });
    }
    if (!stock || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Please enter a valid stock quantity' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Product description is required' });
    }
   
    // Base images (min 3 required)
    
    if (!req.files?.images || req.files.images.length < 3) {
      return res.status(400).json({ message: 'Please upload at least 3 base product images' });
    }

    const parsedColors = colors ? JSON.parse(colors) : [];
    const parsedVariants = variants ? JSON.parse(variants) : [];

    // Base images — Cloudinary gives full URL in f.path
    const imagePaths = req.files.images.map(f => f.path);

    // Color images — group by color name using metadata
    const colorFiles = req.files?.colorImages || [];
    const colorMetaRaw = req.body.colorImageMeta;
    const colorMetas = colorMetaRaw
      ? (Array.isArray(colorMetaRaw) ? colorMetaRaw : [colorMetaRaw]).map(m => JSON.parse(m))
      : [];

    const colorMap = {};
    colorFiles.forEach((file, i) => {
      const meta = colorMetas[i] || {};
      const colorName = meta.color;
      if (!colorName) return;
      if (!colorMap[colorName]) colorMap[colorName] = [];
      colorMap[colorName].push(file.path);
    });

    const colorImagesArray = Object.entries(colorMap).map(([color, images]) => ({
      color,
      images
    }));

    // Variant images
    const variantFiles = req.files?.variantImages || [];
    const variantMetaRaw = req.body.variantImageMeta;
    const variantMetas = variantMetaRaw
      ? (Array.isArray(variantMetaRaw) ? variantMetaRaw : [variantMetaRaw]).map(m => JSON.parse(m))
      : [];

    const variantImagesArray = variantFiles.map((file, i) => ({
      variant: variantMetas[i]?.variant || '',
      image: file.path
    }));

    await Product.create({
      name: name.trim(),
      brand,
      category,
      description: description.trim(),
      specifications: specifications || '',
      price: Number(price),
      originalPrice: Number(originalPrice) || Number(price),
      discount: Number(discount) || 0,
      stock: Number(stock),
      images: imagePaths,
      colors: parsedColors,
      variants: parsedVariants,
      colorImages: colorImagesArray,
      variantImages: variantImagesArray,
      isActive: isActive === 'true'
    });

    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A product with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to add product. Please try again.' });
  }
};


// PUT /api/admin/products/:id - edit product
exports.updateProduct = async (req, res) => {
  try {
    const { name, brand, category, description, specifications,
            price, originalPrice, discount, stock, isActive, colors, variants } = req.body;
    
    // Validation        
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!brand) {
      return res.status(400).json({ message: 'Please select a brand' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Please select a category' });
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: 'Please enter a valid price greater than 0' });
    }
    if (!stock || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Please enter a valid stock quantity' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Product description is required' });
    }        

  const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.name = name.trim();
    product.brand = brand;
    product.category = category;
    product.description = description.trim();
    product.specifications = specifications || '';
    product.price = Number(price);
    product.originalPrice = Number(originalPrice) || Number(price);
    product.discount = Number(discount) || 0;
    product.stock = Number(stock);
    product.isActive = isActive === 'true';
    product.colors = colors ? JSON.parse(colors) : [];
    product.variants = variants ? JSON.parse(variants) : [];

    // Replace base images if new ones uploaded
    if (req.files?.images && req.files.images.length >= 3) {
      product.images = req.files.images.map(f => f.path);
    }

    // Individual image replacements
    if (req.files?.replacementImages) {
      const files = Array.isArray(req.files.replacementImages)
        ? req.files.replacementImages
        : [req.files.replacementImages];
      const indexes = req.body.replacementIndexes
        ? (Array.isArray(req.body.replacementIndexes)
            ? req.body.replacementIndexes
            : [req.body.replacementIndexes])
        : [];
      files.forEach((file, i) => {
        const idx = parseInt(indexes[i]);
        if (!isNaN(idx) && idx >= 0 && idx < product.images.length) {
          product.images[idx] = file.path;
        }
      });
    }

    // Update color images
    if (req.files?.colorImages && req.files.colorImages.length > 0) {
      const colorFiles = req.files.colorImages;
      const colorMetaRaw = req.body.colorImageMeta;
      const colorMetas = colorMetaRaw
        ? (Array.isArray(colorMetaRaw) ? colorMetaRaw : [colorMetaRaw]).map(m => JSON.parse(m))
        : [];

      const colorMap = {};
      colorFiles.forEach((file, i) => {
        const meta = colorMetas[i] || {};
        const colorName = meta.color;
        if (!colorName) return;
        if (!colorMap[colorName]) colorMap[colorName] = [];
        colorMap[colorName].push(file.path);
      });

      const existingColorMap = {};
      product.colorImages.forEach(ci => {
        existingColorMap[ci.color] = ci.images;
      });
      Object.entries(colorMap).forEach(([color, images]) => {
        existingColorMap[color] = images;
      });
      product.colorImages = Object.entries(existingColorMap).map(([color, images]) => ({ color, images }));
    }

    // Update variant images
    if (req.files?.variantImages && req.files.variantImages.length > 0) {
      const variantFiles = req.files.variantImages;
      const variantMetaRaw = req.body.variantImageMeta;
      const variantMetas = variantMetaRaw
        ? (Array.isArray(variantMetaRaw) ? variantMetaRaw : [variantMetaRaw]).map(m => JSON.parse(m))
        : [];

      const variantMap = {};
      product.variantImages.forEach(vi => {
        variantMap[vi.variant] = vi.image;
      });
      variantFiles.forEach((file, i) => {
        const meta = variantMetas[i] || {};
        if (meta.variant) {
          variantMap[meta.variant] = file.path;
        }
      });
      product.variantImages = Object.entries(variantMap).map(([variant, image]) => ({ variant, image }));
    }

    await product.save();
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A product with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to update product. Please try again.' });
  }
};



// PUT /api/admin/products/:id/toggle-status - the green switch
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

     await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: !product.isActive } }
    );

    res.status(200).json({
      message: product.isActive ? 'Product activated' : 'Product deactivated'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/products/:id - soft delete
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
       return res.status(404).json({ message: 'Product not found' });
    }
   
    // Use findByIdAndUpdate instead of .save() to avoid version conflicts
    await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: true } }
    );


    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/inventory
exports.getInventory = async (req, res) => {
  try {
    const search = req.query.search || '';
    const stockFilter = req.query.stock || ''; // 'low', 'out', or ''
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { isDeleted: false };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Stock filter
    if (stockFilter === 'out') {
      filter.stock = 0;
    } else if (stockFilter === 'low') {
      filter.stock = { $gt: 0, $lte: 10 };
    }

    const products = await Product.find(filter)
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort({ stock: 1 }) // lowest stock first
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name brand category stock images isActive');

    const total = await Product.countDocuments(filter);

    // Count summaries
    const outOfStock = await Product.countDocuments({ isDeleted: false, stock: 0 });
    const lowStock = await Product.countDocuments({ isDeleted: false, stock: { $gt: 0, $lte: 10 } });
    const inStock = await Product.countDocuments({ isDeleted: false, stock: { $gt: 10 } });

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProducts: total,
      summary: { outOfStock, lowStock, inStock }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load inventory' });
  }
};

// PUT /api/admin/inventory/:id/stock - update stock directly
exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock === undefined || stock === null || isNaN(stock)) {
      return res.status(400).json({ message: 'Please enter a valid stock quantity' });
    }
    if (Number(stock) < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { stock: Number(stock) } },
      { new: true }
    ).select('name stock');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      message: `Stock updated to ${stock} for ${product.name}`,
      stock: product.stock
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update stock' });
  }
};