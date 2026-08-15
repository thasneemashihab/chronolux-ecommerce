const Coupon = require('../../models/Coupon');

// GET /api/users/coupons - list all currently valid coupons
exports.getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now }
    }).sort({ createdAt: -1 });

    res.status(200).json({ coupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load coupons' });
  }
};

// POST /api/users/coupons/apply - validate a coupon against current order amount
exports.applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({ message: 'Coupon code and order amount are required' });
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    const now = new Date();
    if (!coupon.isActive || now < coupon.validFrom || now > coupon.validTill) {
      return res.status(400).json({ message: 'This coupon has expired or is no longer active' });
    }

    if (Number(orderAmount) < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount.toLocaleString()} required for this coupon`
      });
    }

    // Check per-user usage limit
    const userUsage = coupon.usedBy.find(u => u.user.toString() === req.userId.toString());
    if (userUsage && userUsage.count >= coupon.usageLimitPerUser) {
      return res.status(400).json({ message: 'You have already used this coupon' });
    }

    // Calculate discount
    let discountAmount;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round(Number(orderAmount) * (coupon.discountValue / 100));
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    res.status(200).json({
      message: `Coupon applied! You saved ₹${discountAmount.toLocaleString()}`,
      couponCode: coupon.code,
      discountAmount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to apply coupon' });
  }
};