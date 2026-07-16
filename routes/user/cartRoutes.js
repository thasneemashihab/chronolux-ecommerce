const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateQuantity, removeFromCart } = require('../../controllers/user/cartController');
const authMiddleware = require('../../middleware/authMiddleware');

// All cart routes require login
router.get('/', authMiddleware, getCart);
router.post('/', authMiddleware, addToCart);
router.put('/:productId', authMiddleware, updateQuantity);
router.delete('/:productId', authMiddleware, removeFromCart);

module.exports = router;