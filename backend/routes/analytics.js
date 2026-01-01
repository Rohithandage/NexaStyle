const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');

// Helper function to check if IP is private/local
function isPrivateIP(ip) {
  if (!ip || ip === 'unknown' || ip === 'localhost') return true;
  
  // Remove IPv6 prefix if present
  let cleanIP = ip.replace('::ffff:', '');
  
  // Check for localhost
  if (cleanIP === '::1' || cleanIP === '127.0.0.1' || cleanIP === 'localhost') {
    return true;
  }
  
  // Check for private IP ranges
  if (cleanIP.startsWith('192.168.') || 
      cleanIP.startsWith('10.') || 
      cleanIP.startsWith('172.16.') || cleanIP.startsWith('172.17.') ||
      cleanIP.startsWith('172.18.') || cleanIP.startsWith('172.19.') ||
      cleanIP.startsWith('172.20.') || cleanIP.startsWith('172.21.') ||
      cleanIP.startsWith('172.22.') || cleanIP.startsWith('172.23.') ||
      cleanIP.startsWith('172.24.') || cleanIP.startsWith('172.25.') ||
      cleanIP.startsWith('172.26.') || cleanIP.startsWith('172.27.') ||
      cleanIP.startsWith('172.28.') || cleanIP.startsWith('172.29.') ||
      cleanIP.startsWith('172.30.') || cleanIP.startsWith('172.31.')) {
    return true;
  }
  
  return false;
}

// Helper function to get country from IP
async function getCountryFromIP(ip) {
  try {
    if (!ip || ip === 'unknown') {
      return { country: 'Unknown', countryCode: 'XX' };
    }
    
    // Clean IP address (remove port if present, handle IPv6)
    let cleanIP = ip;
    
    // Remove IPv6 mapped IPv4 prefix
    if (cleanIP.startsWith('::ffff:')) {
      cleanIP = cleanIP.replace('::ffff:', '');
    }
    
    // Handle IP with port
    if (cleanIP.includes(':') && !cleanIP.includes('::')) {
      // IPv4 with port (e.g., "192.168.1.1:8080")
      const parts = cleanIP.split(':');
      cleanIP = parts[0];
    }
    
    // Check if it's a private IP
    const isPrivate = isPrivateIP(cleanIP);
    console.log('IP to lookup:', cleanIP, 'Is Private:', isPrivate);
    
    // Even if it looks private, try to look it up (sometimes proxies give private-looking IPs that are actually public)
    // Only skip if it's definitely localhost
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
      console.log('Skipping localhost IP');
      return { country: 'Local', countryCode: 'LOC' };
    }

    console.log('Attempting country lookup for IP:', cleanIP);

    // Try ip-api.com first (free, no API key) - use HTTPS and shorter timeout
    try {
      const response = await axios.get(`https://ip-api.com/json/${cleanIP}?fields=status,country,countryCode`, {
        timeout: 3000, // Reduced timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: function (status) {
          return status < 500; // Don't throw for 4xx errors
        }
      });

      console.log('ip-api.com response status:', response.status);
      console.log('ip-api.com response data:', response.data);

      if (response.data && response.data.status === 'success' && response.data.country) {
        const result = {
          country: response.data.country || 'Unknown',
          countryCode: response.data.countryCode || 'XX'
        };
        console.log('✅ Country found via ip-api.com:', result);
        return result;
      } else if (response.data && response.data.status === 'fail') {
        console.log('❌ ip-api.com returned fail:', response.data.message);
      }
    } catch (apiError) {
      console.log('❌ ip-api.com error:', apiError.message);
      if (apiError.code === 'ECONNABORTED') {
        console.log('ip-api.com timeout');
      }
    }

    // Fallback to ipgeolocation.io (free tier)
    try {
      const response = await axios.get(`https://api.ipgeolocation.io/ipgeo?ip=${cleanIP}&apiKey=free`, {
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        validateStatus: function (status) {
          return status < 500;
        }
      });

      console.log('ipgeolocation.io response:', response.data);

      if (response.data && response.data.country_name) {
        const result = {
          country: response.data.country_name || 'Unknown',
          countryCode: response.data.country_code2 || 'XX'
        };
        console.log('✅ Country found via ipgeolocation.io:', result);
        return result;
      }
    } catch (apiError3) {
      console.log('❌ ipgeolocation.io error:', apiError3.message);
    }

    // Fallback to ipapi.co (free tier with rate limits)
    try {
      const response = await axios.get(`https://ipapi.co/${cleanIP}/json/`, {
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: function (status) {
          return status < 500;
        }
      });

      console.log('ipapi.co response:', response.data);

      if (response.data && response.data.country_name && !response.data.error) {
        const result = {
          country: response.data.country_name || 'Unknown',
          countryCode: response.data.country_code || 'XX'
        };
        console.log('✅ Country found via ipapi.co:', result);
        return result;
      } else if (response.data && response.data.error) {
        console.log('❌ ipapi.co returned error:', response.data.reason);
      }
    } catch (apiError2) {
      console.log('❌ ipapi.co error:', apiError2.message);
      if (apiError2.code === 'ECONNABORTED') {
        console.log('ipapi.co timeout');
      }
    }

    // If we get here and IP looks private, return Local
    if (isPrivate) {
      console.log('IP appears private and geolocation failed, returning Local');
      return { country: 'Local', countryCode: 'LOC' };
    }

    console.log('All geolocation attempts failed for IP:', cleanIP);
    return { country: 'Unknown', countryCode: 'XX' };
  } catch (error) {
    console.error('Error fetching country from IP:', error.message);
    return { country: 'Unknown', countryCode: 'XX' };
  }
}

// Track visitor (no auth required - public endpoint)
router.post('/track-visitor', async (req, res) => {
  console.log('=== TRACK VISITOR ENDPOINT CALLED ===');
  console.log('Request received at:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    // Get today's date in UTC and set to start of day
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    console.log('Looking for analytics entry for date:', today.toISOString());

    // Try to find analytics entry for today
    // Use $gte and $lt to handle date range properly
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let analytics = await Analytics.findOne({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    if (!analytics) {
      analytics = new Analytics({ date: today });
      console.log('Created new analytics entry for today:', today.toISOString());
    } else {
      console.log('Found existing analytics entry, current visitors:', analytics.totalVisitors);
      console.log('Analytics date:', analytics.date);
    }

    // Get IP address from various sources (prioritize proxy headers)
    // When behind a proxy (like Render/Netlify), the real IP is in x-forwarded-for
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is usually the real client IP
    let ip = null;
    
    // Try x-forwarded-for first (most reliable when behind proxy)
    if (req.headers['x-forwarded-for']) {
      const forwardedIPs = req.headers['x-forwarded-for'].split(',').map(ip => ip.trim());
      // Get the first IP that's not private
      for (const forwardedIP of forwardedIPs) {
        if (!isPrivateIP(forwardedIP)) {
          ip = forwardedIP;
          break;
        }
      }
      // If all are private, use the first one anyway
      if (!ip && forwardedIPs.length > 0) {
        ip = forwardedIPs[0];
      }
    }
    
    // If still no valid IP, try other headers
    if (!ip || isPrivateIP(ip)) {
      ip = req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] || // Cloudflare
           req.headers['x-client-ip'] ||
           req.headers['true-client-ip'] || // Some proxies use this
           null;
    }
    
    // Fallback to Express req.ip (works with trust proxy)
    if (!ip || isPrivateIP(ip)) {
      ip = req.ip;
    }
    
    // Last resort fallbacks
    if (!ip || isPrivateIP(ip)) {
      ip = req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
    }
    
    // Clean up IPv6 mapped IPv4 addresses
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    
    // Remove port if present
    if (ip && ip.includes(':') && !ip.includes('::')) {
      const parts = ip.split(':');
      ip = parts[0];
    }
    
    console.log('=== IP Detection ===');
    console.log('Final IP:', ip);
    console.log('Is Private:', isPrivateIP(ip));
    console.log('Request headers:', {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
      'x-client-ip': req.headers['x-client-ip'],
      'true-client-ip': req.headers['true-client-ip'],
      'req.ip': req.ip,
      'connection.remoteAddress': req.connection?.remoteAddress
    });
    
    // Get country data (non-blocking - don't wait if it takes too long)
    let countryData = { country: 'Unknown', countryCode: 'XX' };
    try {
      console.log('Starting country lookup for IP:', ip);
      // Reduced timeout to 4 seconds total
      countryData = await Promise.race([
        getCountryFromIP(ip),
        new Promise((resolve) => setTimeout(() => {
          console.log('⚠️ Country lookup timeout after 4 seconds - using Unknown');
          resolve({ country: 'Unknown', countryCode: 'XX' });
        }, 4000))
      ]);
      console.log('✅ Country detection result:', countryData);
    } catch (countryError) {
      console.error('❌ Country detection error:', countryError.message);
      console.error('Country detection error stack:', countryError.stack);
      countryData = { country: 'Unknown', countryCode: 'XX' };
    }

    // If we got a client country code hint and IP lookup failed, try to use it
    console.log('Checking for client country code. Current countryData:', countryData);
    console.log('Request body clientCountryCode:', req.body.clientCountryCode);
    
    if ((countryData.country === 'Unknown' || countryData.country === 'Local') && req.body.clientCountryCode) {
      console.log('🔄 Using client-provided country code as fallback:', req.body.clientCountryCode);
      // Map country code to country name (expanded mapping)
      const countryCodeMap = {
        'US': 'United States', 'IN': 'India', 'GB': 'United Kingdom', 'CA': 'Canada',
        'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
        'BR': 'Brazil', 'MX': 'Mexico', 'JP': 'Japan', 'CN': 'China', 'KR': 'South Korea',
        'RU': 'Russia', 'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
        'FI': 'Finland', 'PL': 'Poland', 'TR': 'Turkey', 'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates',
        'SG': 'Singapore', 'MY': 'Malaysia', 'TH': 'Thailand', 'ID': 'Indonesia', 'PH': 'Philippines',
        'VN': 'Vietnam', 'NZ': 'New Zealand', 'ZA': 'South Africa', 'EG': 'Egypt', 'NG': 'Nigeria',
        'KE': 'Kenya', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru',
        'PT': 'Portugal', 'GR': 'Greece', 'IE': 'Ireland', 'CH': 'Switzerland', 'AT': 'Austria',
        'BE': 'Belgium', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria'
      };
      
      const clientCode = req.body.clientCountryCode.toUpperCase();
      console.log('Looking up country for code:', clientCode);
      
      if (countryCodeMap[clientCode]) {
        countryData = {
          country: countryCodeMap[clientCode],
          countryCode: clientCode
        };
        console.log('✅ Successfully using client country code:', countryData);
      } else {
        console.log('⚠️ Country code not found in map:', clientCode);
        // Still use the code even if we don't have the name
        countryData = {
          country: clientCode, // Use code as country name if not in map
          countryCode: clientCode
        };
        console.log('Using country code directly:', countryData);
      }
    } else {
      console.log('❌ Not using client country code. Reason:', {
        countryDataIsUnknown: countryData.country === 'Unknown',
        countryDataIsLocal: countryData.country === 'Local',
        hasClientCode: !!req.body.clientCountryCode
      });
    }

    const visitorData = {
      ip: ip,
      userAgent: req.get('user-agent') || 'Unknown',
      page: req.body.page || 'home',
      country: countryData.country,
      countryCode: countryData.countryCode
    };

    analytics.visitors.push(visitorData);
    analytics.totalVisitors += 1;
    
    console.log('Saving analytics with', analytics.totalVisitors, 'total visitors');
    console.log('Visitor data:', visitorData);
    
    const savedAnalytics = await analytics.save();
    console.log('Analytics saved successfully. Total visitors:', savedAnalytics.totalVisitors);
    console.log('Saved analytics date:', savedAnalytics.date);

    res.json({ 
      success: true, 
      visitors: savedAnalytics.totalVisitors, 
      country: countryData.country,
      countryCode: countryData.countryCode,
      date: savedAnalytics.date
    });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    // Use UTC for date calculations to avoid timezone issues
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const last7Days = new Date(today);
    last7Days.setUTCDate(last7Days.getUTCDate() - 7);
    const last30Days = new Date(today);
    last30Days.setUTCDate(last30Days.getUTCDate() - 30);

    // Today's stats - use date range query
    const startOfToday = new Date(today);
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);
    
    const todayAnalytics = await Analytics.findOne({
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    });
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

    // Get country statistics from all time (to show more data)
    const allAnalytics = await Analytics.find({});

    const countryStats = {};
    allAnalytics.forEach(analytics => {
      if (analytics.visitors && Array.isArray(analytics.visitors)) {
        analytics.visitors.forEach(visitor => {
          if (visitor && visitor.country) {
            if (!countryStats[visitor.country]) {
              countryStats[visitor.country] = {
                country: visitor.country,
                countryCode: visitor.countryCode || 'XX',
                count: 0
              };
            }
            countryStats[visitor.country].count += 1;
          }
        });
      }
    });

    // Convert to array and sort by count
    const countryStatsArray = Object.values(countryStats)
      .sort((a, b) => b.count - a.count);
    
    console.log('Country stats:', countryStatsArray); // Debug log

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
      },
      countries: countryStatsArray || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test endpoint to check IP detection (for debugging - no auth required)
router.get('/test-ip', async (req, res) => {
  try {
    // Get IP using same logic as track-visitor
    let ip = null;
    
    if (req.headers['x-forwarded-for']) {
      const forwardedIPs = req.headers['x-forwarded-for'].split(',').map(ip => ip.trim());
      for (const forwardedIP of forwardedIPs) {
        if (!isPrivateIP(forwardedIP)) {
          ip = forwardedIP;
          break;
        }
      }
      if (!ip && forwardedIPs.length > 0) {
        ip = forwardedIPs[0];
      }
    }
    
    if (!ip || isPrivateIP(ip)) {
      ip = req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] ||
           req.headers['x-client-ip'] ||
           req.headers['true-client-ip'] ||
           null;
    }
    
    if (!ip || isPrivateIP(ip)) {
      ip = req.ip;
    }
    
    if (!ip || isPrivateIP(ip)) {
      ip = req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
    }
    
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    
    if (ip && ip.includes(':') && !ip.includes('::')) {
      const parts = ip.split(':');
      ip = parts[0];
    }
    
    // Try to get country
    const countryData = await getCountryFromIP(ip);
    
    res.json({
      ip: ip,
      isPrivate: isPrivateIP(ip),
      country: countryData,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'x-client-ip': req.headers['x-client-ip'],
        'true-client-ip': req.headers['true-client-ip'],
        'req.ip': req.ip,
        'connection.remoteAddress': req.connection?.remoteAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;


