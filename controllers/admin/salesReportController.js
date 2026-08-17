const Order = require('../../models/Order');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// GET /api/admin/sales-report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    // Exclude cancelled orders from revenue calculations, but let admin filter to see them if they choose status=Cancelled
    const revenueFilter = { ...filter };
    if (!status) {
      revenueFilter.status = { $ne: 'Cancelled' };
    }

    const orders = await Order.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    // Summary stats — calculated on revenueFilter (excludes cancelled unless explicitly filtered)
    const allMatchingOrders = await Order.find(revenueFilter);

    const totalOrders = allMatchingOrders.length;
    const totalRevenue = allMatchingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalDiscounts = allMatchingOrders.reduce((sum, o) => sum + o.discount + o.couponDiscount, 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const netRevenue = totalRevenue; // totalAmount already has discounts subtracted

    res.status(200).json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        totalDiscounts,
        netRevenue
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load sales report' });
  }
};


// GET /api/admin/sales-report/export-pdf
exports.exportSalesPDF = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const orders = await Order.find(filter).populate('user', 'name').sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('ChronoLux — Sales Report', { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    const cols = [30, 100, 180, 260, 340, 400, 460, 520, 580, 650];
    const headers = ['Order ID', 'Date', 'Customer', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Status'];

    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, cols[i], tableTop));

    doc.font('Helvetica');
    let y = tableTop + 20;
    orders.forEach(o => {
      doc.text(o.orderId, cols[0], y, { width: 65 });
      doc.text(new Date(o.createdAt).toLocaleDateString('en-IN'), cols[1], y);
      doc.text(o.user?.name || 'Unknown', cols[2], y, { width: 75 });
      doc.text(o.paymentMethod, cols[3], y);
      doc.text(`₹${o.subtotal}`, cols[4], y);
      doc.text(`₹${o.discount + o.couponDiscount}`, cols[5], y);
      doc.text(`₹${o.shippingCharge}`, cols[6], y);
      doc.text(`₹${o.tax}`, cols[7], y);
      doc.text(`₹${o.totalAmount}`, cols[8], y);
      doc.text(o.status, cols[9], y);
      y += 20;
      if (y > 500) { doc.addPage({ layout: 'landscape' }); y = 30; }
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

// GET /api/admin/sales-report/export-excel
exports.exportSalesExcel = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const orders = await Order.find(filter).populate('user', 'name').sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    sheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Payment Method', key: 'payment', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Shipping', key: 'shipping', width: 12 },
      { header: 'Tax', key: 'tax', width: 10 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    sheet.getRow(1).font = { bold: true };

    orders.forEach(o => {
      sheet.addRow({
        orderId: o.orderId,
        date: new Date(o.createdAt).toLocaleDateString('en-IN'),
        customer: o.user?.name || 'Unknown',
        payment: o.paymentMethod,
        subtotal: o.subtotal,
        discount: o.discount + o.couponDiscount,
        shipping: o.shippingCharge,
        tax: o.tax,
        total: o.totalAmount,
        status: o.status
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate Excel file' });
  }
};