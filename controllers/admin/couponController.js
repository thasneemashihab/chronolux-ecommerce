const Coupon = require('../../models/Coupon');

// GET /api/admin/coupons
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ coupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load coupons' });
  }
};

exports.addCoupon = async (req, res) => {
  try {
    const { name, code, discountType, discountValue, minOrderAmount, maxDiscount, validTill, usageLimitPerUser } = req.body;

    if (!name || !code || !discountType || !discountValue || !validTill) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }

    await Coupon.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      validTill: new Date(validTill),
      usageLimitPerUser: Number(usageLimitPerUser) || 1
    });

    res.status(201).json({ message: 'Coupon created successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { name, code, discountType, discountValue, minOrderAmount, maxDiscount, validTill, isActive } = req.body;
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.name = name.trim();
    coupon.code = code.trim().toUpperCase();
    coupon.discountType = discountType;
    coupon.discountValue = Number(discountValue);
    coupon.minOrderAmount = Number(minOrderAmount) || 0;
    coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    coupon.validTill = new Date(validTill);
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();
    res.status(200).json({ message: 'Coupon updated successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

// PUT /api/admin/coupons/:id/toggle-status
exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({ message: coupon.isActive ? 'Coupon activated' : 'Coupon deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// DELETE /api/admin/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};