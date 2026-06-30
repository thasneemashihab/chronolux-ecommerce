const express = require('express');
const router = express.Router();
const {
  getProducts, getProductDropdowns, addProduct,
  updateProduct, toggleProductStatus, deleteProduct
} = require('../../controllers/admin/productController');
const adminAuth = require('../../middleware/adminAuth');
const upload = require('../../middleware/upload');

router.get('/', adminAuth, getProducts);
router.get('/dropdowns', adminAuth, getProductDropdowns);
router.post('/', adminAuth, upload.array('images', 5), addProduct);
router.put('/:id', adminAuth, upload.array('images', 5), updateProduct);
router.put('/:id/toggle-status', adminAuth, toggleProductStatus);
router.delete('/:id', adminAuth, deleteProduct);

module.exports = router;