const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { getAvailableCoupons, applyCoupon , getReferralInfo } = require('../../controllers/user/couponController');

router.get('/', authMiddleware, getAvailableCoupons);
router.post('/apply', authMiddleware, applyCoupon);
router.get('/referral', authMiddleware, getReferralInfo); 

module.exports = router;