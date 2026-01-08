const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const { auth, admin } = require('../middleware/auth');

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    // Check if reviews are enabled globally
    const Settings = require('../models/Settings');
    const reviewsSetting = await Settings.findOne({ key: 'reviews_enabled' });
    const reviewsEnabled = reviewsSetting ? reviewsSetting.value === 'true' : true; // Default to enabled
    
    if (!reviewsEnabled) {
      return res.json([]); // Return empty array if reviews are disabled
    }

    const reviews = await Review.find({ 
      product: req.params.productId,
      isApproved: true,
      isDisabled: false // Only show non-disabled reviews
    })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create review
router.post('/', auth, async (req, res) => {
  try {
    // Check if reviews are enabled globally
    const Settings = require('../models/Settings');
    const reviewsSetting = await Settings.findOne({ key: 'reviews_enabled' });
    const reviewsEnabled = reviewsSetting ? reviewsSetting.value === 'true' : true; // Default to enabled
    
    if (!reviewsEnabled) {
      return res.status(403).json({ message: 'Reviews are currently disabled' });
    }

    const { productId, rating, comment } = req.body;

    // Validate input
    if (!productId || !rating || !comment) {
      return res.status(400).json({ message: 'Product ID, rating, and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Allow multiple reviews - removed the duplicate check
    const review = new Review({
      user: req.user._id,
      product: productId,
      rating,
      comment,
      isApproved: true // Auto-approve reviews so they show immediately
    });

    await review.save();

    // Update product rating (count only approved and non-disabled reviews)
    const allReviews = await Review.find({ 
      product: productId,
      isApproved: true,
      isDisabled: false
    });
    
    if (allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      product.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal place
      product.numReviews = allReviews.length;
    } else {
      product.rating = 0;
      product.numReviews = 0;
    }
    
    await product.save();

    await review.populate('user', 'name avatar');
    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve review (Admin only)
router.put('/approve/:id', auth, admin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isApproved = true;
    await review.save();

    // Update product rating (use only approved and non-disabled reviews)
    const product = await Product.findById(review.product);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const allReviews = await Review.find({ 
      product: review.product,
      isApproved: true,
      isDisabled: false
    });
    
    if (allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      product.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal place
      product.numReviews = allReviews.length;
    } else {
      product.rating = 0;
      product.numReviews = 0;
    }
    
    await product.save();

    res.json(review);
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending reviews (Admin only)
router.get('/admin/pending', auth, admin, async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: false })
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reviews (Admin only) - for managing reviews
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Disable/Enable review (Admin only)
router.put('/toggle/:id', auth, admin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isDisabled = !review.isDisabled;
    await review.save();

    // Update product rating (use only approved and non-disabled reviews)
    const product = await Product.findById(review.product);
    if (product) {
      const allReviews = await Review.find({ 
        product: review.product,
        isApproved: true,
        isDisabled: false
      });
      
      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        product.rating = Math.round(avgRating * 10) / 10;
        product.numReviews = allReviews.length;
      } else {
        product.rating = 0;
        product.numReviews = 0;
      }
      
      await product.save();
    }

    res.json(review);
  } catch (error) {
    console.error('Error toggling review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


