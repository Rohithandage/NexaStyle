const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  colors: [{
    type: String
  }]
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Men', 'Women', 'Kids']
  },
  slug: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subcategories: [subcategorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Category', categorySchema);


