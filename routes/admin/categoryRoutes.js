const express = require('express');
const router = express.Router();
const {
  getCategories, getCategoryDropdown, addCategory,
  updateCategory, toggleListCategory, deleteCategory
} = require('../../controllers/admin/categoryController');
const adminAuth = require('../../middleware/adminAuth');
const upload = require('../../middleware/upload');

router.get('/', adminAuth, getCategories);
router.get('/dropdown', adminAuth, getCategoryDropdown);
router.post('/', adminAuth, upload.single('image'), addCategory);
router.put('/:id', adminAuth, upload.single('image'), updateCategory);
router.put('/:id/toggle-list', adminAuth, toggleListCategory);
router.delete('/:id', adminAuth, deleteCategory);

module.exports = router;