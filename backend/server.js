const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Passport config
require('./config/passport');

const app = express();

// Trust proxy to get real IP address
app.set('trust proxy', true);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',           // Development frontend
  'https://nexastyle.onrender.com',   // Production frontend (Render)
  'https://nexastyle.netlify.app',    // Production frontend (Netlify)
  'https://nexa-style.vercel.app'     // Production frontend (Vercel)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development, allow localhost on any port for flexibility
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Skip JSON parsing for webhook routes (need raw body for signature verification)
app.use((req, res, next) => {
  if (req.path === '/api/razorpay/webhook' || req.path === '/api/orders/webhook') {
    return express.raw({ type: 'application/json' })(req, res, next);
  }
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static file requests
  const origin = req.headers.origin;
  if (allowedOrigins.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
}, express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexastyle', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/razorpay', require('./routes/razorpay')); // Razorpay webhook route


app.get('/', (req, res) => {
  res.status(200).send('NexaStyle Backend is running');
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'NexaStyle API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

