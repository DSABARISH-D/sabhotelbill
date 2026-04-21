const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Today's stats
    const todayOrders = await Order.find({ createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: 'Cancelled' } });
    const todayRevenue = todayOrders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.totalAmount, 0);
    const todayPending = todayOrders.filter(o => o.paymentStatus === 'Pending').length;

    // Monthly stats
    const monthOrders = await Order.find({ createdAt: { $gte: thisMonth, $lt: nextMonth }, status: { $ne: 'Cancelled' } });
    const monthRevenue = monthOrders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.totalAmount, 0);

    // All time stats
    const totalOrders = await Order.countDocuments({ status: { $ne: 'Cancelled' } });
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Last 7 days revenue chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayOrders = await Order.find({ createdAt: { $gte: dayStart, $lt: dayEnd }, paymentStatus: 'Paid' });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      last7Days.push({
        date: dayStart.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        orders: dayOrders.length
      });
    }

    // Top selling items
    const topItems = await Order.aggregate([
      { $match: { status: 'Completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.subtotal' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // Payment method breakdown
    const paymentBreakdown = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]);

    // Active orders (current)
    const activeOrders = await Order.find({ status: 'Active' }).populate('createdBy', 'name').sort({ createdAt: -1 });

    res.json({
      success: true,
      stats: {
        today: { orders: todayOrders.length, revenue: todayRevenue, pending: todayPending },
        month: { orders: monthOrders.length, revenue: monthRevenue },
        allTime: { orders: totalOrders, revenue: totalRevenue[0]?.total || 0 },
        last7Days,
        topItems,
        paymentBreakdown,
        activeOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/dashboard/recent-orders
router.get('/recent-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/dashboard/export
router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'Paid', status: { $ne: 'Cancelled' } }).sort({ createdAt: 1 });
    
    // Group by date
    const dailyData = {};
    orders.forEach(o => {
      // Use YYYY-MM-DD for easier spreadsheet sorting
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, total: 0, cash: 0, upi: 0, card: 0, expenses: 0 };
      }
      dailyData[dateStr].total += o.totalAmount;
      if (o.paymentMethod === 'Cash') dailyData[dateStr].cash += o.totalAmount;
      if (o.paymentMethod === 'UPI') dailyData[dateStr].upi += o.totalAmount;
      if (o.paymentMethod === 'Card') dailyData[dateStr].card += o.totalAmount;
    });

    const csvRows = ['Date,Total,Cash Today,UPI Payment,Other Expenses,Net Total'];
    Object.values(dailyData).forEach(row => {
      csvRows.push(`${row.date},${row.total.toFixed(2)},${row.cash.toFixed(2)},${row.upi.toFixed(2)},${row.expenses.toFixed(2)},${row.total.toFixed(2)}`);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Hotel_Payment_Report.csv"');
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
