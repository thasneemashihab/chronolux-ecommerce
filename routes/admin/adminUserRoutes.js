const express = require('express');
const router = express.Router();
const { getUsers, toggleBlockUser } = require('../../controllers/admin/adminUserController');
const adminAuth = require('../../middleware/adminAuth');

router.get('/', adminAuth, getUsers);
router.put('/:userId/toggle-block', adminAuth, toggleBlockUser);

module.exports = router;