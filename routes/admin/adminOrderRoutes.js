const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  approveReturn
} = require('../../controllers/admin/adminOrderController');
const adminAuth = require('../../middleware/adminAuth');

router.get('/', adminAuth, getOrders);
router.get('/:id', adminAuth, getOrderDetail);
router.put('/:id/status', adminAuth, updateOrderStatus);
router.put('/:id/approve-return', adminAuth, approveReturn);

module.exports = router;