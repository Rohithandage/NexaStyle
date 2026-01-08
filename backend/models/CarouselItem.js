const mongoose = require('mongoose');

const carouselItemSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    default: 'Carousel Item'
  },
  buttonText: {
    type: String,
    default: 'Shop Now'
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  order: {
    type: Number,
    default: 0
  },
  // Optional list of country codes (e.g., 'IN', 'US', 'CN') where this carousel item should be shown.
  // If empty or not set, the item will be shown for all countries.
  countries: [{
    type: String,
    trim: true
  }],
  isActive: {
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

module.exports = mongoose.model('CarouselItem', carouselItemSchema);

