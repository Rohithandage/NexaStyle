const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  offerType: {
    type: String,
    enum: ['coupon', 'bundle', 'carousel'],
    default: 'coupon'
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    required: function() {
      return this.offerType === 'coupon';
    }
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
    required: function() {
      return this.offerType === 'coupon';
    }
  },
  couponDisplayText: {
    type: String,
    trim: true
  },
  // Bundle offer fields
  category: {
    type: String,
    enum: ['Men', 'Women', 'Kids'],
    required: false // Made optional to support cross-category subcategories
  },
  subcategories: [{
    type: String
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  bundlePrice: {
    type: Number,
    min: 0,
    required: function() {
      return this.offerType === 'bundle';
    }
  },
  bundleQuantity: {
    type: Number,
    min: 1,
    required: function() {
      return this.offerType === 'bundle';
    }
  },
  bundleDisplayText: {
    type: String,
    trim: true
  },
  // Carousel offer fields
  carouselId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CarouselItem',
    required: function() {
      return this.offerType === 'carousel';
    }
  },
  carouselDisplayText: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showOnHomePage: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Offer', offerSchema);

