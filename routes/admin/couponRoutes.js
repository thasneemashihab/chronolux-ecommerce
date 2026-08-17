const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const { getCoupons, addCoupon, updateCoupon, toggleCouponStatus, deleteCoupon } = require('../../controllers/admin/couponController');

router.get('/', adminAuth, getCoupons);
router.post('/', adminAuth, addCoupon);
router.put('/:id', adminAuth, updateCoupon);
router.put('/:id/toggle-status', adminAuth, toggleCouponStatus);
router.delete('/:id', adminAuth, deleteCoupon);

module.exports = router;
