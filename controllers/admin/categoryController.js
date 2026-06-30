const Category = require('../../models/Category');

// GET /api/admin/categories
exports.getCategories = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {
      isDeleted: false,
      name: { $regex: search, $options: 'i' }
    };

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name')   // replaces parentCategory ID with its actual name
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Category.countDocuments(filter);

    res.status(200).json({
      categories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCategories: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/categories/dropdown - for the "Parent Category" select dropdown
exports.getCategoryDropdown = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }).select('name');
    res.status(200).json({ categories });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/admin/categories - add new category (with image upload)
exports.addCategory = async (req, res) => {
  try {
    const { name, slug, parentCategory } = req.body;

    const existing = await Category.findOne({ name, isDeleted: false });
    if (existing) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const existingSlug = await Category.findOne({ slug, isDeleted: false });
    if (existingSlug) {
      return res.status(400).json({ message: 'Slug already in use' });
    }

    const imagePath = req.file ? `/uploads/categories/${req.file.filename}` : '';

    await Category.create({
      name,
      slug,
      parentCategory: parentCategory || null,
      image: imagePath
    });

    res.status(201).json({ message: 'Category added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/categories/:id - edit category
exports.updateCategory = async (req, res) => {
  try {
    const { name, slug, parentCategory } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.name = name;
    category.slug = slug;
    category.parentCategory = parentCategory || null;

    // Only replace the image if a NEW one was uploaded
    if (req.file) {
      category.image = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();
    res.status(200).json({ message: 'Category updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/categories/:id/toggle-list - the eye icon
exports.toggleListCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isListed = !category.isListed;
    await category.save();

    res.status(200).json({
      message: category.isListed ? 'Category listed' : 'Category unlisted',
      isListed: category.isListed
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/categories/:id - soft delete (trash icon)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isDeleted = true;
    await category.save();

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

