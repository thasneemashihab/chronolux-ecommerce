const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const {
  getCheckoutData,
  createRazorpayOrder,
  placeOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  returnOrderItem
} = require('../../controllers/user/orderController');

router.get('/checkout-data', authMiddleware, getCheckoutData);
router.post('/create-razorpay-order',authMiddleware, createRazorpayOrder);
router.post('/place', authMiddleware, placeOrder);
router.get('/', authMiddleware, getUserOrders);
router.get('/:orderId', authMiddleware, getOrderDetails);
router.put('/:orderId/cancel', authMiddleware, cancelOrder);
router.put('/:orderId/return', authMiddleware, returnOrder);
router.put('/:orderId/cancel-item/:itemId', authMiddleware, cancelOrderItem);
router.put('/:orderId/return-item/:itemId', authMiddleware, returnOrderItem);

module.exports = router;