const express = require('express');
const router = express.Router();
const {
  getCheckoutData,
  placeOrder,
  getOrderDetails
} = require('../../controllers/user/orderController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/checkout-data', authMiddleware, getCheckoutData);
router.post('/place', authMiddleware, placeOrder);
router.get('/:orderId', authMiddleware, getOrderDetails);

module.exports = router;