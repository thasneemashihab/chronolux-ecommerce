const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const { getSalesReport, exportSalesPDF, exportSalesExcel } = require('../../controllers/admin/salesReportController');

router.get('/', adminAuth, getSalesReport);
router.get('/export-pdf', adminAuth, exportSalesPDF);
router.get('/export-excel', adminAuth, exportSalesExcel);

module.exports = router;