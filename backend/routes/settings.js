const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');
const CarouselItem = require('../models/CarouselItem');

// Get header images (public route) - returns carousel items
router.get('/header-images', async (req, res) => {
  try {
    // Try to get carousel items first (new system)
    const carouselItems = await CarouselItem.find({ isActive: true })
      .populate('productIds', 'name images price discountPrice _id')
      .sort({ order: 1, createdAt: 1 });
    
    console.log('Found carousel items:', carouselItems.length);
    
    // Log carousel items for debugging
    if (carouselItems.length > 0) {
      console.log('Carousel items details:', carouselItems.map(item => ({
        _id: item._id,
        name: item.name,
        imageUrl: item.imageUrl,
        isActive: item.isActive,
        productIdsCount: item.productIds?.length || 0
      })));
    }
    
    // If carousel items exist, return them
    if (carouselItems.length > 0) {
      // Format for backward compatibility - include both formats
      const images = carouselItems.map(item => ({
        imageUrl: item.imageUrl,
        name: item.name || 'Carousel Item',
        buttonText: item.buttonText || 'Shop Now',
        productIds: item.productIds && Array.isArray(item.productIds) ? item.productIds.map(p => {
          // Handle both populated objects and ID strings
          if (typeof p === 'object' && p._id) {
            return p._id.toString();
          }
          return p ? p.toString() : '';
        }).filter(id => id) : [],
        _id: item._id
      }));
      
      // Also format carouselItems to ensure consistent structure
      const formattedCarouselItems = carouselItems.map(item => ({
        imageUrl: item.imageUrl,
        name: item.name || 'Carousel Item',
        buttonText: item.buttonText || 'Shop Now',
        productIds: item.productIds && Array.isArray(item.productIds) ? item.productIds.map(p => {
          // Handle both populated objects and ID strings
          if (typeof p === 'object' && p._id) {
            return p._id.toString();
          }
          return p ? p.toString() : '';
        }).filter(id => id) : [],
        _id: item._id
      }));
      
      return res.json({ 
        headerImages: images,
        carouselItems: formattedCarouselItems // Formatted with consistent structure
      });
    }
    
    // Fallback to old system (Settings-based)
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
    const { includeAll } = req.query;
    let query = { isActive: true };
    
    // If includeAll is true, return all active offers (including bundle/carousel)
    // Otherwise, only return offers that should show on home page
    if (includeAll !== 'true') {
      query.showOnHomePage = true;
    }
    
    // Populate carouselId with productIds for carousel offers
    const offers = await Offer.find(query)
      .populate('carouselId', 'productIds')
      .sort({ createdAt: -1 });
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

