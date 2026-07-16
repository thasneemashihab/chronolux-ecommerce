const Product = require('../../models/Product');

// GET /api/admin/products
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

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
    
    //Build base image paths
    const imagePaths = req.files.images.map(f => `/uploads/products/${f.filename}`);
    
    const parsedColors = colors ? JSON.parse(colors) : [];
    const parsedVariants = variants ? JSON.parse(variants) : [];

        // Build colorImages — group uploaded color images by color name using metadata
    const colorImagesResult = [];
    const colorFiles = req.files?.colorImages || [];
    const colorMetaRaw = req.body.colorImageMeta;
    const colorMetas = colorMetaRaw
      ? (Array.isArray(colorMetaRaw) ? colorMetaRaw : [colorMetaRaw]).map(m => JSON.parse(m))
      : [];

    // Group by color name
    const colorMap = {};
    colorFiles.forEach((file, i) => {
      const meta = colorMetas[i] || {};
      const colorName = meta.color;
      if (!colorName) return;
      if (!colorMap[colorName]) colorMap[colorName] = [];
      colorMap[colorName].push(`/uploads/products/${file.filename}`);
    });

    // Convert to array format
    Object.entries(colorMap).forEach(([color, images]) => {
      colorImagesResult.push({ color, images });
    });

    // Build variantImages
    const variantImagesResult = [];
    const variantFiles = req.files?.variantImages || [];
    const variantMetaRaw = req.body.variantImageMeta;
    const variantMetas = variantMetaRaw
      ? (Array.isArray(variantMetaRaw) ? variantMetaRaw : [variantMetaRaw]).map(m => JSON.parse(m))
      : [];

    variantFiles.forEach((file, i) => {
      const meta = variantMetas[i] || {};
      if (meta.variant) {
        variantImagesResult.push({
          variant: meta.variant,
          image: `/uploads/products/${file.filename}`
        });
      }
    });

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
      colorImages: colorImagesResult,
      variantImages: variantImagesResult,
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
      product.images = req.files.images.map(f => `/uploads/products/${f.filename}`);
    }

    // Handle individual image replacements
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
          product.images[idx] = `/uploads/products/${file.filename}`;
        }
      });
    }

    // Update color images if new ones uploaded
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
        colorMap[colorName].push(`/uploads/products/${file.filename}`);
      });

      // Merge with existing — replace only uploaded colors, keep others
      const existingColorMap = {};
      product.colorImages.forEach(ci => {
        existingColorMap[ci.color] = ci.images;
      });
      Object.entries(colorMap).forEach(([color, images]) => {
        existingColorMap[color] = images;
      });
      product.colorImages = Object.entries(existingColorMap).map(([color, images]) => ({ color, images }));
    }

    // Update variant images if new ones uploaded
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
          variantMap[meta.variant] = `/uploads/products/${file.filename}`;
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