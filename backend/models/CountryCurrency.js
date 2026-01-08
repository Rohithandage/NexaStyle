const mongoose = require('mongoose');

const countryCurrencySchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  countryCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  currency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  currencySymbol: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('CountryCurrency', countryCurrencySchema);

