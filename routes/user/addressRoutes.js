const express = require('express');
const router = express.Router();
const { getAddresses, addAddress, updateAddress, deleteAddress } = require('../../controllers/user/addressController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/', authMiddleware, getAddresses);
router.post('/', authMiddleware, addAddress);
router.put('/:addressId', authMiddleware, updateAddress);
router.delete('/:addressId', authMiddleware, deleteAddress);

module.exports = router;