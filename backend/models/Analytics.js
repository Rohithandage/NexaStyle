const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  page: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    unique: true
  },
  visitors: [visitorSchema],
  totalVisitors: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Analytics', analyticsSchema);


