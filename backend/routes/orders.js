const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

// @route   GET /api/orders
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    const orders = await Order.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/orders
router.post('/', protect, async (req, res) => {
  try {
    const { tableNumber, customerName, customerPhone, items, discount, notes } = req.body;

    // Calculate totals
    let subtotal = 0;
    let gstAmount = 0;
    const processedItems = items.map(item => {
      const itemSubtotal = item.price * item.quantity;
      const rate = (item.gstRate != null && !isNaN(item.gstRate)) ? item.gstRate : 5;
      const itemGst = (itemSubtotal * rate) / 100;
      subtotal += itemSubtotal;
      gstAmount += itemGst;
      return { ...item, subtotal: itemSubtotal };
    });

    const discountAmount = discount || 0;
    const totalAmount = subtotal + gstAmount - discountAmount;

    const order = await Order.create({
      tableNumber, customerName, customerPhone,
      items: processedItems,
      subtotal, gstAmount,
      discount: discountAmount,
      totalAmount,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Order created', order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   GET /api/orders/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('createdBy', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/pay
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const { paymentMethod, upiTransactionId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'Paid';
    order.status = 'Completed';
    order.paidAt = new Date();
    if (upiTransactionId) order.upiTransactionId = upiTransactionId;
    await order.save();

    // PDF invoice generation disabled by user.

    // Export to Google Sheet
    if (process.env.GOOGLE_SHEETS_WEBHOOK && process.env.GOOGLE_SHEETS_WEBHOOK.includes('script.google.com')) {
      try {
        const axios = require('axios');
        const payload = {
          billNumber: order.orderNumber,
          cash: paymentMethod === 'Cash' ? order.totalAmount : 0,
          upi: paymentMethod === 'UPI' ? order.totalAmount : 0,
          expenses: 0,
          total: order.totalAmount
        };
        axios.post(process.env.GOOGLE_SHEETS_WEBHOOK, payload)
          .then(r => console.log('✅ Google Sheets saved:', r.data))
          .catch(e => console.error('❌ Google Sheet Push Error:', e.message));
      } catch (e) {
        console.error('Axios error:', e);
      }
    }

    res.json({ success: true, message: 'Payment confirmed', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled', updatedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate PDF Invoice
async function generateInvoice(order) {
  const invoicesDir = path.join(__dirname, '../invoices');
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const filename = `invoice-${order.orderNumber}.pdf`;
  const filepath = path.join(invoicesDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).fillColor('#1a1a2e').text('GRAND PALACE HOTEL', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('123 Hotel Street, City - 600001', { align: 'center' });
    doc.text('Phone: +91 9876543210 | Email: info@grandpalace.com', { align: 'center' });
    doc.text('GST No: 27AABCU9603R1ZX', { align: 'center' });
    doc.moveDown();

    // Invoice title
    doc.fontSize(18).fillColor('#e94560').text('TAX INVOICE', { align: 'center' });
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e94560');
    doc.moveDown(0.5);

    // Order details
    doc.fontSize(10).fillColor('#333');
    const detailsY = doc.y;
    doc.text(`Order No: ${order.orderNumber}`, 50, detailsY);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`, 300, detailsY);
    doc.text(`Table: ${order.tableNumber}`, 50, detailsY + 20);
    doc.text(`Payment: ${order.paymentMethod}`, 300, detailsY + 20);
    doc.text(`Customer: ${order.customerName}`, 50, detailsY + 40);
    if (order.upiTransactionId) doc.text(`UPI Ref: ${order.upiTransactionId}`, 300, detailsY + 40);
    doc.moveDown(4);

    // Items table header
    const tableTop = doc.y + 10;
    doc.rect(50, tableTop, 495, 20).fill('#1a1a2e');
    doc.fillColor('white').fontSize(10);
    doc.text('Item', 60, tableTop + 5, { width: 180 });
    doc.text('Category', 240, tableTop + 5, { width: 80 });
    doc.text('Price', 320, tableTop + 5, { width: 60, align: 'right' });
    doc.text('Qty', 380, tableTop + 5, { width: 40, align: 'right' });
    doc.text('Amount', 420, tableTop + 5, { width: 120, align: 'right' });

    // Items
    let y = tableTop + 25;
    let rowIndex = 0;
    order.items.forEach(item => {
      if (rowIndex % 2 === 0) doc.rect(50, y - 3, 495, 18).fill('#f8f9fa');
      doc.fillColor('#333');
      doc.text(item.name, 60, y, { width: 180 });
      doc.text(item.category || '', 240, y, { width: 80 });
      doc.text(`Rs.${item.price.toFixed(2)}`, 320, y, { width: 60, align: 'right' });
      doc.text(item.quantity.toString(), 380, y, { width: 40, align: 'right' });
      doc.text(`Rs.${item.subtotal.toFixed(2)}`, 420, y, { width: 120, align: 'right' });
      y += 20;
      rowIndex++;
    });

    // Totals
    doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke('#ddd');
    y += 15;
    doc.fontSize(10).fillColor('#333');
    doc.text('Subtotal:', 380, y); doc.text(`Rs.${order.subtotal.toFixed(2)}`, 460, y);
    y += 18;
    doc.text('GST:', 380, y); doc.text(`Rs.${order.gstAmount.toFixed(2)}`, 460, y);
    if (order.discount > 0) {
      y += 18;
      doc.text('Discount:', 380, y); doc.text(`-Rs.${order.discount.toFixed(2)}`, 460, y);
    }
    y += 18;
    doc.rect(350, y - 2, 195, 22).fill('#1a1a2e');
    doc.fontSize(12).fillColor('white');
    doc.text('TOTAL:', 360, y + 3); doc.text(`Rs.${order.totalAmount.toFixed(2)}`, 440, y + 3, { width: 100, align: 'right' });

    // Footer
    doc.moveDown(3);
    doc.fontSize(9).fillColor('#666').text('Thank you for dining with us! Visit us again.', { align: 'center' });
    doc.text('This is a computer generated invoice.', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/invoices/${filename}`));
    stream.on('error', reject);
  });
}

module.exports = router;
