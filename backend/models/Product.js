const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number
  },
  category: {
    type: String,
    required: true,
    enum: ['Men', 'Women', 'Kids']
  },
  subcategory: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  sizes: [{
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    discountPrice: {
      type: Number
    },
    stock: {
      type: Number,
      default: 0
    }
  }],
  colors: [{
    color: {
      type: String,
      required: true
    },
    images: [{
      type: String
    }]
  }],
  getPrintName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTrending: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Product', productSchema);


