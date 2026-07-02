const express = require('express');
const router = express.Router();
const { getProducts, getProductDetails, addReview } = require('../../controllers/user/productController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductDetails);
router.post('/:id/review', authMiddleware, addReview);

module.exports = router;