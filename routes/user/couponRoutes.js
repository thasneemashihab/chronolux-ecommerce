const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { getAvailableCoupons, applyCoupon } = require('../../controllers/user/couponController');

router.get('/', authMiddleware, getAvailableCoupons);
router.post('/apply', authMiddleware, applyCoupon);

module.exports = router;