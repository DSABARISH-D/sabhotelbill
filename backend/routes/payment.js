const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { protect } = require('../middleware/auth');

// @route   POST /api/payment/generate-qr
router.post('/generate-qr', protect, async (req, res) => {
  try {
    const { amount, orderId, orderNumber } = req.body;
    const upiId = process.env.UPI_ID || 'hotelbilling@upi';
    const hotelName = encodeURIComponent(process.env.HOTEL_NAME || 'Grand Palace Hotel');

    // UPI payment URL format
    const upiUrl = `upi://pay?pa=${upiId}&pn=${hotelName}&am=${amount}&cu=INR&tn=Order-${orderNumber}&tr=${orderId}`;

    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });

    res.json({
      success: true,
      qrCode: qrDataUrl,
      upiId,
      amount,
      upiUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
