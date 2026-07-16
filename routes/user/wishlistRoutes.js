const express = require('express');
const router = express.Router();
const {
  getWishlist, addToWishlist, removeFromWishlist,
  clearWishlist, moveAllToCart
} = require('../../controllers/user/wishlistController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/', authMiddleware, getWishlist);
router.post('/:productId', authMiddleware, addToWishlist);
router.delete('/clear', authMiddleware, clearWishlist);
router.post('/move-all-to-cart', authMiddleware, moveAllToCart);
router.delete('/:productId', authMiddleware, removeFromWishlist);

module.exports = router;