const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { auth, admin } = require('../middleware/auth');

// Middleware to check admin
router.use(auth);
router.use(admin);

// Category Management
// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add subcategory
router.post('/categories/:categoryId/subcategories', async (req, res) => {
  try {
    const { name, colors } = req.body;
    const category = await Category.findById(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const subcategoryData = { name, slug };
    
    if (colors && Array.isArray(colors)) {
      subcategoryData.colors = colors.filter(c => c.trim() !== '');
    }
    
    category.subcategories.push(subcategoryData);
    category.updatedAt = new Date();
    await category.save();

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update subcategory
router.put('/categories/:categoryId/subcategories/:subcategoryId', async (req, res) => {
  try {
    const { name, isActive, colors } = req.body;
    const category = await Category.findById(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategory = category.subcategories.id(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    if (name) {
      subcategory.name = name;
      subcategory.slug = name.toLowerCase().replace(/\s+/g, '-');
    }
    if (isActive !== undefined) {
      subcategory.isActive = isActive;
    }
    if (colors !== undefined) {
      if (Array.isArray(colors)) {
        subcategory.colors = colors.filter(c => c.trim() !== '');
      }
    }

    category.updatedAt = new Date();
    await category.save();

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete subcategory
router.delete('/categories/:categoryId/subcategories/:subcategoryId', async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.subcategories = category.subcategories.filter(
      sub => sub._id.toString() !== req.params.subcategoryId
    );
    category.updatedAt = new Date();
    await category.save();

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Product Management
// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create product
router.post('/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Order Management
// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, updatedAt: new Date() },
      { new: true }
    ).populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Settings Management
// Get header images
router.get('/settings/header-images', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'header_images' });
    const images = setting ? JSON.parse(setting.value) : [];
    res.json({ headerImages: images });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add header image
router.post('/settings/header-images', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    let setting = await Settings.findOne({ key: 'header_images' });
    let images = [];
    
    if (setting) {
      images = JSON.parse(setting.value);
    }
    
    if (!images.includes(imageUrl)) {
      images.push(imageUrl);
      if (setting) {
        setting.value = JSON.stringify(images);
        setting.updatedAt = new Date();
        await setting.save();
      } else {
        setting = new Settings({ key: 'header_images', value: JSON.stringify(images) });
        await setting.save();
      }
    }
    
    res.json({ success: true, headerImages: images });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove header image
router.delete('/settings/header-images', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const setting = await Settings.findOne({ key: 'header_images' });
    
    if (setting) {
      let images = JSON.parse(setting.value);
      images = images.filter(img => img !== imageUrl);
      setting.value = JSON.stringify(images);
      setting.updatedAt = new Date();
      await setting.save();
      res.json({ success: true, headerImages: images });
    } else {
      res.json({ success: true, headerImages: [] });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get header image (backward compatibility)
router.get('/settings/header-image', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'header_images' });
    const images = setting ? JSON.parse(setting.value) : [];
    res.json({ headerImage: images.length > 0 ? images[0] : null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


