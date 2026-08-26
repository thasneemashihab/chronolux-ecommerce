const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const { getDashboardData } = require('../../controllers/admin/dashboardController');

router.get('/', adminAuth, getDashboardData);

module.exports = router;