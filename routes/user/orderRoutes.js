const express = require('express');
const router = express.Router();
const {
  getCheckoutData,
  placeOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder
} = require('../../controllers/user/orderController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/checkout-data', authMiddleware, getCheckoutData);
router.post('/place', authMiddleware, placeOrder);
router.get('/', authMiddleware, getUserOrders);
router.get('/:orderId', authMiddleware, getOrderDetails);
router.put('/:orderId/cancel', authMiddleware, cancelOrder);
router.put('/:orderId/cancel-item/:itemId', authMiddleware, cancelOrderItem);
router.put('/:orderId/return', authMiddleware, returnOrder);

module.exports = router;