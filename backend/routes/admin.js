const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { auth, admin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df5r3j9cc',
  api_key: process.env.CLOUDINARY_API_KEY || '481492652749781',
  api_secret: process.env.CLOUDINARY_API_SECRET || '1V3u4ARwQDCIFmqS0Rc_wNjsoOE'
});

// Helper function to extract public_id from Cloudinary URL
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // If it's already a public_id (doesn't contain http)
  if (!url.startsWith('http')) {
    return url.includes('/') ? url : `nexastyle/${url}`;
  }
  
  // If it's a Cloudinary URL, extract public_id
  if (url.includes('cloudinary.com')) {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1 && urlParts[uploadIndex + 2]) {
        // Get the part after version (v1234567890)
        const versionAndId = urlParts[uploadIndex + 2];
        // Remove file extension and version if present
        let publicId = versionAndId.split('.')[0];
        // Remove version prefix (v1234567890) if present
        if (publicId.startsWith('v') && /^v\d+/.test(publicId)) {
          publicId = publicId.replace(/^v\d+/, '');
        }
        return publicId;
      }
    } catch (error) {
      console.error('Error extracting public_id from URL:', url, error);
      return null;
    }
  }
  
  return null;
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', publicId, error);
    return false;
  }
};

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
    // First, get the product to extract image URLs
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Collect all image URLs from the product
    const imageUrls = [];
    
    // Add main product images
    if (product.images && Array.isArray(product.images)) {
      imageUrls.push(...product.images);
    }
    
    // Add color-specific images
    if (product.colors && Array.isArray(product.colors)) {
      product.colors.forEach(colorItem => {
        if (typeof colorItem === 'object' && colorItem.images && Array.isArray(colorItem.images)) {
          imageUrls.push(...colorItem.images);
        }
      });
    }
    
    // Delete all images from Cloudinary
    const deletePromises = imageUrls.map(url => {
      const publicId = extractPublicId(url);
      if (publicId) {
        return deleteFromCloudinary(publicId);
      }
      return Promise.resolve(false);
    });
    
    // Wait for all deletions to complete (don't fail if some fail)
    await Promise.allSettled(deletePromises);
    
    // Now delete the product from database
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product and associated images deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
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
    // Support both req.body (for JSON) and req.query (as fallback)
    const imageUrl = req.body?.imageUrl || req.query?.imageUrl;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    const setting = await Settings.findOne({ key: 'header_images' });
    
    if (setting) {
      let images = JSON.parse(setting.value);
      const initialLength = images.length;
      
      // Filter out the image - try multiple matching strategies
      images = images.filter(img => {
        if (!img) return true;
        
        // Exact match
        if (img === imageUrl) return false;
        
        // Normalize URLs by removing trailing slashes and comparing
        const normalize = (url) => {
          if (!url) return '';
          return url.toString().trim().replace(/\/$/, '');
        };
        
        const normalizedImg = normalize(img);
        const normalizedTarget = normalize(imageUrl);
        
        // Normalized match
        if (normalizedImg === normalizedTarget) return false;
        
        // Check if URLs point to the same resource (one contains the other's unique identifier)
        // This handles cases where URLs might have different protocols or domains
        if (normalizedImg && normalizedTarget) {
          // Extract the unique part (after the last slash or the filename)
          const getUniquePart = (url) => {
            try {
              const urlObj = new URL(url);
              return urlObj.pathname.split('/').pop() || urlObj.pathname;
            } catch {
              return url.split('/').pop() || url;
            }
          };
          
          const imgPart = getUniquePart(img);
          const targetPart = getUniquePart(imageUrl);
          
          // If the unique parts match, it's the same image
          if (imgPart && targetPart && imgPart === targetPart) return false;
          
          // Also check if one URL contains the other (for partial matches)
          if (normalizedImg.includes(normalizedTarget) || normalizedTarget.includes(normalizedImg)) {
            return false;
          }
        }
        
        return true;
      });
      
      // Only save if something was actually removed
      if (images.length < initialLength) {
        setting.value = JSON.stringify(images);
        setting.updatedAt = new Date();
        await setting.save();
        res.json({ success: true, headerImages: images, message: 'Image removed successfully' });
      } else {
        // Log for debugging
        console.log('Image not found. Looking for:', imageUrl);
        console.log('Current images:', images);
        res.status(404).json({ 
          success: false, 
          message: 'Image not found in header images', 
          headerImages: images 
        });
      }
    } else {
      res.json({ success: true, headerImages: [], message: 'No header images found' });
    }
  } catch (error) {
    console.error('Error removing header image:', error);
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

// Logo Management
// Get logo
router.get('/settings/logo', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'logo' });
    const logoUrl = setting ? setting.value : null;
    res.json({ logo: logoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set logo
router.post('/settings/logo', auth, admin, async (req, res) => {
  try {
    const { logoUrl } = req.body;
    if (!logoUrl) {
      return res.status(400).json({ message: 'Logo URL is required' });
    }
    
    let setting = await Settings.findOne({ key: 'logo' });
    if (setting) {
      setting.value = logoUrl;
      setting.updatedAt = new Date();
      await setting.save();
    } else {
      setting = new Settings({ key: 'logo', value: logoUrl });
      await setting.save();
    }
    
    res.json({ success: true, logo: logoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete logo
router.delete('/settings/logo', auth, admin, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'logo' });
    if (setting) {
      await setting.deleteOne();
      res.json({ success: true, message: 'Logo removed successfully' });
    } else {
      res.json({ success: true, message: 'No logo found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


