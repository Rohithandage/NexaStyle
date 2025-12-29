const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

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

module.exports = router;

