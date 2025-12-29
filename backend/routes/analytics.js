const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/auth');

// Track visitor
router.post('/track-visitor', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });
    
    if (!analytics) {
      analytics = new Analytics({ date: today });
    }

    analytics.visitors.push({
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      page: req.body.page || 'home'
    });

    analytics.totalVisitors += 1;
    await analytics.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get analytics (Admin only)
router.get('/', auth, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const analytics = await Analytics.find(query).sort({ date: -1 });
    
    // Get order statistics
    let orderQuery = {};
    if (startDate && endDate) {
      orderQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const orders = await Order.find(orderQuery);
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.paidAmount, 0);
    const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
    const completedOrders = orders.filter(o => o.orderStatus === 'delivered').length;

    // Calculate total visitors
    const totalVisitors = analytics.reduce((sum, a) => sum + a.totalVisitors, 0);

    res.json({
      analytics,
      statistics: {
        totalVisitors,
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard stats
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    // Today's stats
    const todayAnalytics = await Analytics.findOne({ date: today });
    const todayOrders = await Order.find({
      createdAt: { $gte: today }
    });
    const todayRevenue = todayOrders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.paidAmount, 0);

    // Last 7 days
    const last7DaysOrders = await Order.find({
      createdAt: { $gte: last7Days }
    });
    const last7DaysRevenue = last7DaysOrders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.paidAmount, 0);

    // Last 30 days
    const last30DaysOrders = await Order.find({
      createdAt: { $gte: last30Days }
    });
    const last30DaysRevenue = last30DaysOrders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.paidAmount, 0);

    // All time
    const allOrders = await Order.find();
    const allRevenue = allOrders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((sum, o) => sum + o.paidAmount, 0);

    res.json({
      today: {
        visitors: todayAnalytics?.totalVisitors || 0,
        orders: todayOrders.length,
        revenue: todayRevenue
      },
      last7Days: {
        orders: last7DaysOrders.length,
        revenue: last7DaysRevenue
      },
      last30Days: {
        orders: last30DaysOrders.length,
        revenue: last30DaysRevenue
      },
      allTime: {
        orders: allOrders.length,
        revenue: allRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


