const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, page = 1, limit = 12, trending, search } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;
    
    // Ensure exact match for subcategory
    if (subcategory) {
      const subcategorySlug = subcategory.trim();
      // Use exact match - this ensures only products with this exact subcategory slug are returned
      query.subcategory = subcategorySlug;
    }
    
    if (trending === 'true') query.isTrending = true;
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(trending === 'true' ? { createdAt: -1 } : { createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get categories with subcategories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


