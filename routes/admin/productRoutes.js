const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductDropdowns,
  addProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  getInventory,
  updateStock
} = require('../../controllers/admin/productController');
const adminAuth = require('../../middleware/adminAuth');
const { uploadProduct } = require('../../config/cloudinary');

router.get('/', adminAuth, getProducts);
router.get('/dropdowns', adminAuth, getProductDropdowns);
router.get('/inventory', adminAuth, getInventory);
router.put('/inventory/:id/stock', adminAuth, updateStock);

router.post('/', adminAuth, uploadProduct.fields([
  { name: 'images', maxCount: 3 },
  { name: 'colorImages', maxCount: 9 },
  { name: 'variantImages', maxCount: 5 }
]), addProduct);

router.put('/:id', adminAuth, uploadProduct.fields([
  { name: 'images', maxCount: 3 },
  { name: 'colorImages', maxCount: 9 },
  { name: 'variantImages', maxCount: 5 },
  { name: 'replacementImages', maxCount: 9 }
]), updateProduct);

router.put('/:id/toggle-status', adminAuth, toggleProductStatus);
router.delete('/:id', adminAuth, deleteProduct);

module.exports = router;