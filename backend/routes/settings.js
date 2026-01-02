const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');

// Get header images (public route)
router.get('/header-images', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'header_images' });
    const images = setting ? JSON.parse(setting.value) : [];
    res.json({ headerImages: images });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get header image (backward compatibility)
router.get('/header-image', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'header_images' });
    const images = setting ? JSON.parse(setting.value) : [];
    res.json({ headerImage: images.length > 0 ? images[0] : null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get logo (public route)
router.get('/logo', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'logo' });
    const logoUrl = setting ? setting.value : null;
    res.json({ logo: logoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get COD charges (public route)
router.get('/cod-charges', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'cod_charges' });
    const charges = setting ? parseFloat(setting.value) || 0 : 0;
    res.json({ codCharges: charges });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active offers (public route) - exclude bundle offers that shouldn't show on home page
router.get('/offers', async (req, res) => {
  try {
    const offers = await Offer.find({ 
      isActive: true,
      showOnHomePage: true 
    }).sort({ createdAt: -1 });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all active offers for checkout (public route) - includes all active offers regardless of showOnHomePage
router.get('/offers/checkout', async (req, res) => {
  try {
    const offers = await Offer.find({ 
      isActive: true,
      offerType: 'coupon' // Only coupon offers for checkout (bundle offers are fetched separately)
    }).sort({ createdAt: -1 });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

