const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { getWallet } = require('../../controllers/user/walletController');

router.get('/', authMiddleware, getWallet);

module.exports = router;