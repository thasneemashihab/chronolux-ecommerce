const Order = require('../../models/Order');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

   function buildOrderSummary(o) {
  const itemCount = o.items?.length || 0;
  const itemWord = itemCount === 1 ? 'item' : 'items';

  if (o.status === 'Delivered') {
    return `Delivered - ${itemCount} ${itemWord}`;
  }
  if (o.status === 'Shipped' || o.status === 'Out for Delivery') {
    return `In transit - ${itemCount} ${itemWord}`;
  }
  if (o.status === 'Processing') {
    return `Processing - ${itemCount} ${itemWord}`;
  }
  return `${o.status} - ${itemCount} ${itemWord}`;
}

// GET /api/admin/sales-report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod, page = 1, limit = 10 } = req.query;

    const filter = {
      status: { $nin: ['Cancelled', 'Returned'] }   // NEW: exclude by default
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // If admin explicitly wants to see cancelled/returned, let them override
    if (status) {
      filter.status = status;
    }

    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const revenueFilter = { ...filter };

    const orders = await Order.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    const allMatchingOrders = await Order.find(revenueFilter);
    const totalOrders = allMatchingOrders.length;
    const totalRevenue = allMatchingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalDiscounts = allMatchingOrders.reduce((sum, o) => sum + o.discount + o.couponDiscount, 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const netRevenue = totalRevenue;

    // NEW: count cancelled/returned separately (not mixed into revenue)
const cancelledReturnedCount = await Order.countDocuments({
  ...(startDate || endDate ? { createdAt: filter.createdAt } : {}),
  status: { $in: ['Cancelled', 'Returned'] }
});

res.status(200).json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      summary: { totalOrders, totalRevenue, averageOrderValue, totalDiscounts, netRevenue, cancelledReturnedCount}
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
    const filter = { status: { $nin: ['Cancelled', 'Returned'] } };
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const orders = await Order.find(filter).populate('user', 'name').sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + o.discount + o.couponDiscount, 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const cancelledReturnedCount = await Order.countDocuments({
      ...(startDate || endDate ? { createdAt: filter.createdAt } : {}),
      status: { $in: ['Cancelled', 'Returned'] }
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('ChronoLux — Sales Report', { align: 'center' });
    doc.moveDown();

   doc.moveDown(1);

    // ---- Table ----
    const cols = [30, 100, 180, 260, 340, 400, 460, 520, 580, 650];
    const colWidths = [65, 75, 75, 75, 55, 55, 55, 55, 65, 90];
    const headers = ['Order ID', 'Date', 'Customer', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Sales Summary'];
    const rowHeight = 20;
    const tableLeft = 30;
    const tableWidth = 740;

    doc.lineWidth(0.5);

    function drawHeaderRow(y) {
      doc.rect(tableLeft, y, tableWidth, rowHeight).fillAndStroke('#e0e0e0', '#999999');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => {
        doc.text(h, cols[i] + 3, y + 6, { width: colWidths[i] - 6 });
      });
    }

 

    function drawDataRow(y, values) {
      doc.rect(tableLeft, y, tableWidth, rowHeight).stroke('#cccccc');
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      values.forEach((val, i) => {
        doc.text(String(val), cols[i] + 3, y + 6, { width: colWidths[i] - 6 });
      });
    }

    let y = doc.y;
    drawHeaderRow(y);
    y += rowHeight;

    orders.forEach(o => {
      if (y > 500) {
        doc.addPage({ layout: 'landscape' });
        y = 30;
        drawHeaderRow(y);
        y += rowHeight;
      }
      drawDataRow(y, [
        o.orderId,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.user?.name || 'Unknown',
        o.paymentMethod,
        `Rs ${o.subtotal}`,
        `Rs ${o.discount + o.couponDiscount}`,
        `Rs ${o.shippingCharge}`,
        `Rs ${o.tax}`,
        `Rs ${o.totalAmount}`,
         buildOrderSummary(o)
      ]);
      y += rowHeight;
    });

    // Vertical column separators across the whole table
    let colX = tableLeft;
    colWidths.forEach(w => {
      doc.moveTo(colX, doc.y - (orders.length + 1) * rowHeight).lineTo(colX, y).strokeColor('#cccccc').stroke();
      colX += w;
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
    
    const filter = { status: { $nin: ['Cancelled', 'Returned'] } };   // NEW: exclude by default
    if (status) filter.status = status;   // allow explicit override,

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
      { header: 'Sales Summary', key: 'status', width: 15 }
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
        status: buildOrderSummary(o)
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