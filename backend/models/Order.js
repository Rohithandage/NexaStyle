const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  quantity: {
    type: Number,
    required: true
  },
  size: String,
  color: String,
  selectedImage: String,
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    // New format fields
    firstName: String,
    lastName: String,
    streetAddress: String,
    state: String,
    townCity: String,
    country: String,
    postcode: String,
    phone: String,
    // Old format fields (for backward compatibility)
    name: String,
    address: String,
    city: String,
    pincode: String
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'cod', 'paypal'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentId: String, // Razorpay payment ID or PayPal capture ID (after payment)
  razorpayOrderId: String, // Razorpay order ID (before payment)
  paypalOrderId: String, // PayPal order ID
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  bundleOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  couponCode: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);


