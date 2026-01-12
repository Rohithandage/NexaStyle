const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');
const CarouselItem = require('../models/CarouselItem');
const Review = require('../models/Review');
const User = require('../models/User');
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

// Update category (enable/disable)
router.put('/categories/:categoryId', async (req, res) => {
  try {
    console.log('[UPDATE CATEGORY] Request received:', {
      categoryId: req.params.categoryId,
      isActive: req.body.isActive,
      body: req.body
    });
    
    const { isActive } = req.body;
    const categoryId = req.params.categoryId;
    
    // Validate ObjectId format
    if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('[UPDATE CATEGORY] Invalid ID format:', categoryId);
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { isActive: isActive !== undefined ? isActive : true, updatedAt: new Date() },
      { new: true }
    );
    
    if (!category) {
      console.log('[UPDATE CATEGORY] Category not found:', categoryId);
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('[UPDATE CATEGORY] Success:', category.name, 'isActive:', category.isActive);
    res.json(category);
  } catch (error) {
    console.error('[UPDATE CATEGORY] Error:', error);
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
    // Validate subcategory - ensure it's a valid slug
    if (req.body.subcategory && req.body.category) {
      const category = await Category.findOne({ name: req.body.category });
      if (category) {
        const validSubcategory = category.subcategories.find(
          sub => sub.slug === req.body.subcategory.trim()
        );
        if (!validSubcategory) {
          return res.status(400).json({ 
            message: 'Invalid subcategory. Subcategory must match a valid slug from the category.' 
          });
        }
        // Ensure we use the exact slug from the database
        req.body.subcategory = validSubcategory.slug;
      }
    }
    
    // Validate and normalize alsoInCategories entries
    if (req.body.alsoInCategories && Array.isArray(req.body.alsoInCategories)) {
      const validatedAlsoInCategories = [];
      for (const item of req.body.alsoInCategories) {
        if (item && item.category && item.subcategory) {
          // Validate that the subcategory exists in the target category
          const targetCategory = await Category.findOne({ name: item.category });
          if (targetCategory) {
            const validSubcategory = targetCategory.subcategories.find(
              sub => sub.slug === item.subcategory.trim() && sub.isActive
            );
            if (validSubcategory) {
              // Use the exact slug from the database
              validatedAlsoInCategories.push({
                category: item.category,
                subcategory: validSubcategory.slug
              });
            }
          }
        }
      }
      req.body.alsoInCategories = validatedAlsoInCategories;
    }
    
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
    // Validate subcategory - ensure it's a valid slug
    if (req.body.subcategory && req.body.category) {
      const category = await Category.findOne({ name: req.body.category });
      if (category) {
        const validSubcategory = category.subcategories.find(
          sub => sub.slug === req.body.subcategory.trim()
        );
        if (!validSubcategory) {
          return res.status(400).json({ 
            message: 'Invalid subcategory. Subcategory must match a valid slug from the category.' 
          });
        }
        // Ensure we use the exact slug from the database
        req.body.subcategory = validSubcategory.slug;
      }
    }
    
    // Ensure alsoInCategories is properly handled (can be empty array)
    const updateData = { ...req.body, updatedAt: new Date() };
    console.log(`[UPDATE PRODUCT] Product ID: ${req.params.id}`);
    console.log(`[UPDATE PRODUCT] Received alsoInCategories:`, JSON.stringify(req.body.alsoInCategories, null, 2));
    
    if (updateData.alsoInCategories === undefined) {
      // If not provided, keep existing value (don't set to empty)
      delete updateData.alsoInCategories;
      console.log(`[UPDATE PRODUCT] alsoInCategories not provided, keeping existing value`);
    } else if (Array.isArray(updateData.alsoInCategories)) {
      // Validate and normalize alsoInCategories entries
      const validatedAlsoInCategories = [];
      for (const item of updateData.alsoInCategories) {
        if (item && item.category && item.subcategory) {
          // Validate that the subcategory exists in the target category
          const targetCategory = await Category.findOne({ name: item.category });
          if (targetCategory) {
            const validSubcategory = targetCategory.subcategories.find(
              sub => sub.slug === item.subcategory.trim() && sub.isActive
            );
            if (validSubcategory) {
              // Use the exact slug from the database
              validatedAlsoInCategories.push({
                category: item.category,
                subcategory: validSubcategory.slug
              });
              console.log(`[UPDATE PRODUCT] Validated entry: ${item.category} - ${validSubcategory.slug}`);
            } else {
              console.log(`[UPDATE PRODUCT] Subcategory not found or inactive: ${item.category} - ${item.subcategory}`);
            }
          } else {
            console.log(`[UPDATE PRODUCT] Category not found: ${item.category}`);
          }
        }
      }
      updateData.alsoInCategories = validatedAlsoInCategories;
      console.log(`[UPDATE PRODUCT] Final validated alsoInCategories:`, JSON.stringify(validatedAlsoInCategories, null, 2));
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    console.log(`[UPDATE PRODUCT] Saved product alsoInCategories:`, JSON.stringify(product?.alsoInCategories, null, 2));
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

// Carousel Item Management
// Get all carousel items
router.get('/carousel-items', async (req, res) => {
  try {
    const carouselItems = await CarouselItem.find({ isActive: true })
      .populate('productIds', 'name images price discountPrice')
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, carouselItems });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all carousel items (including inactive) for admin
router.get('/carousel-items/all', async (req, res) => {
  try {
    const carouselItems = await CarouselItem.find()
      .populate('productIds', 'name images price discountPrice')
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, carouselItems });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create carousel item
router.post('/carousel-items', async (req, res) => {
  try {
    const { imageUrl, name, buttonText, productIds, order, countries } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    const carouselItem = new CarouselItem({
      imageUrl,
      name: name || 'Carousel Item',
      buttonText: buttonText || 'Shop Now',
      productIds: productIds || [],
      order: order || 0,
      countries: Array.isArray(countries) ? countries.filter(Boolean) : [],
      isActive: true
    });
    
    await carouselItem.save();
    await carouselItem.populate('productIds', 'name images price discountPrice');
    
    res.json({ success: true, carouselItem });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update carousel item
router.put('/carousel-items/:id', async (req, res) => {
  try {
    const { imageUrl, name, buttonText, productIds, order, isActive, countries } = req.body;
    
    const updateData = { updatedAt: new Date() };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (name !== undefined) updateData.name = name;
    if (buttonText !== undefined) updateData.buttonText = buttonText;
    if (productIds !== undefined) updateData.productIds = productIds;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (countries !== undefined) {
      updateData.countries = Array.isArray(countries) ? countries.filter(Boolean) : [];
    }
    
    const carouselItem = await CarouselItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('productIds', 'name images price discountPrice');
    
    if (!carouselItem) {
      return res.status(404).json({ message: 'Carousel item not found' });
    }
    
    res.json({ success: true, carouselItem });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete carousel item
router.delete('/carousel-items/:id', async (req, res) => {
  try {
    const carouselItem = await CarouselItem.findByIdAndDelete(req.params.id);
    
    if (!carouselItem) {
      return res.status(404).json({ message: 'Carousel item not found' });
    }
    
    res.json({ success: true, message: 'Carousel item deleted successfully' });
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

// Notes Management
// Get notes
router.get('/settings/notes', auth, admin, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'admin_notes' });
    const notes = setting ? setting.value : '';
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save notes
router.post('/settings/notes', auth, admin, async (req, res) => {
  try {
    const { notes } = req.body;
    // Ensure notes is always a string, even if empty, null, or undefined
    const notesValue = (notes !== null && notes !== undefined) ? String(notes) : '';
    
    let setting = await Settings.findOne({ key: 'admin_notes' });
    if (setting) {
      setting.value = notesValue;
      setting.updatedAt = new Date();
      await setting.save();
    } else {
      setting = new Settings({ key: 'admin_notes', value: notesValue });
      await setting.save();
    }
    
    res.json({ success: true, notes: notesValue });
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get COD charges
router.get('/settings/cod-charges', auth, admin, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'cod_charges' });
    const charges = setting ? parseFloat(setting.value) || 0 : 0;
    res.json({ success: true, codCharges: charges });
  } catch (error) {
    console.error('Error fetching COD charges:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set COD charges
router.post('/settings/cod-charges', auth, admin, async (req, res) => {
  try {
    const { codCharges } = req.body;
    const chargesValue = parseFloat(codCharges) || 0;
    
    if (chargesValue < 0) {
      return res.status(400).json({ message: 'COD charges cannot be negative' });
    }
    
    let setting = await Settings.findOne({ key: 'cod_charges' });
    if (setting) {
      setting.value = chargesValue.toString();
      setting.updatedAt = new Date();
      await setting.save();
    } else {
      setting = new Settings({ key: 'cod_charges', value: chargesValue.toString() });
      await setting.save();
    }
    
    res.json({ success: true, codCharges: chargesValue });
  } catch (error) {
    console.error('Error saving COD charges:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reviews enabled setting
router.get('/settings/reviews-enabled', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'reviews_enabled' });
    const reviewsEnabled = setting ? setting.value === 'true' : true; // Default to enabled
    res.json({ success: true, reviewsEnabled });
  } catch (error) {
    console.error('Error getting reviews enabled setting:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set reviews enabled setting
router.post('/settings/reviews-enabled', auth, admin, async (req, res) => {
  try {
    const { reviewsEnabled } = req.body;
    const enabledValue = reviewsEnabled === true || reviewsEnabled === 'true' ? 'true' : 'false';
    
    let setting = await Settings.findOne({ key: 'reviews_enabled' });
    if (setting) {
      setting.value = enabledValue;
      setting.updatedAt = new Date();
      await setting.save();
    } else {
      setting = new Settings({ key: 'reviews_enabled', value: enabledValue });
      await setting.save();
    }
    
    res.json({ success: true, reviewsEnabled: enabledValue === 'true' });
  } catch (error) {
    console.error('Error saving reviews enabled setting:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Offer Management
// Get all offers
router.get('/offers', async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('products')
      .sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create offer
router.post('/offers', async (req, res) => {
  try {
    const { 
      code, 
      offerType, 
      discount, 
      discountType, 
      description,
      couponDisplayText,
      isActive, 
      showOnHomePage,
      // Bundle offer fields
      category,
      subcategories,
      products,
      bundlePrice,
      bundleQuantity,
      bundleDisplayText,
      // Carousel offer fields
      carouselId,
      carouselDisplayText,
      // Country-specific pricing
      pricingByCountry,
      discountByCountry
    } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    
    const offerTypeValue = offerType || 'coupon';
    
    // Validate coupon offer
    if (offerTypeValue === 'coupon') {
      if (discount === undefined) {
        return res.status(400).json({ message: 'Discount is required for coupon offers' });
      }
      if (discountType === 'percentage' && (discount < 0 || discount > 100)) {
        return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
      }
      if (discountType === 'fixed' && discount < 0) {
        return res.status(400).json({ message: 'Fixed discount cannot be negative' });
      }
    }
    
      // Validate bundle offer
      if (offerTypeValue === 'bundle') {
        if (!subcategories || subcategories.length === 0) {
          return res.status(400).json({ message: 'At least one subcategory is required for bundle offers' });
        }
        const quantity = parseInt(bundleQuantity);
        if (!bundleQuantity || isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ message: 'Bundle quantity is required and must be at least 1' });
        }
        const price = parseFloat(bundlePrice);
        if (!bundlePrice || isNaN(price) || price < 0) {
          return res.status(400).json({ message: 'Valid bundle price is required' });
        }
        if (!products || !Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ message: 'At least one product is required for bundle offers' });
        }
        if (quantity > products.length) {
          return res.status(400).json({ message: `Bundle quantity (${quantity}) cannot be greater than available products (${products.length})` });
        }
      }
      
      // Validate carousel offer
      if (offerTypeValue === 'carousel') {
        if (!carouselId) {
          return res.status(400).json({ message: 'Carousel ID is required for carousel offers' });
        }
        const quantity = parseInt(bundleQuantity);
        if (!bundleQuantity || isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ message: 'Offer quantity is required and must be at least 1' });
        }
        const price = parseFloat(bundlePrice);
        if (!bundlePrice || isNaN(price) || price < 0) {
          return res.status(400).json({ message: 'Valid offer price is required' });
        }
        if (!products || !Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ message: 'At least one product is required for carousel offers' });
        }
        if (quantity > products.length) {
          return res.status(400).json({ message: `Offer quantity (${quantity}) cannot be greater than available products (${products.length})` });
        }
      }
    
    const offerData = {
      code: code.toUpperCase().trim(),
      offerType: offerTypeValue,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      showOnHomePage: showOnHomePage !== undefined ? showOnHomePage : (offerTypeValue === 'coupon')
    };
    
    if (offerTypeValue === 'coupon') {
      offerData.discount = discount;
      offerData.discountType = discountType || 'percentage';
      offerData.couponDisplayText = couponDisplayText || '';
      // Add country-specific discount if provided
      if (discountByCountry && Array.isArray(discountByCountry) && discountByCountry.length > 0) {
        // Filter out empty entries
        const validDiscountByCountry = discountByCountry.filter(d => 
          d.country && d.currency && d.discount !== undefined && d.discount !== null && d.discount !== ''
        );
        if (validDiscountByCountry.length > 0) {
          offerData.discountByCountry = validDiscountByCountry.map(d => ({
            country: d.country,
            currency: d.currency,
            discount: parseFloat(d.discount),
            discountType: d.discountType || 'percentage'
          }));
        }
      }
    } else if (offerTypeValue === 'bundle') {
      offerData.category = category;
      offerData.subcategories = subcategories || [];
      offerData.products = products;
      offerData.bundlePrice = parseFloat(bundlePrice);
      offerData.bundleQuantity = parseInt(bundleQuantity);
      offerData.bundleDisplayText = bundleDisplayText || '';
      // Add country-specific pricing if provided
      if (pricingByCountry && Array.isArray(pricingByCountry) && pricingByCountry.length > 0) {
        // Filter out empty entries
        const validPricingByCountry = pricingByCountry.filter(p => 
          p.country && p.currency && p.bundlePrice !== undefined && p.bundlePrice !== null && p.bundlePrice !== ''
        );
        if (validPricingByCountry.length > 0) {
          offerData.pricingByCountry = validPricingByCountry.map(p => ({
            country: p.country,
            currency: p.currency,
            bundlePrice: parseFloat(p.bundlePrice)
          }));
        }
      }
    } else if (offerTypeValue === 'carousel') {
      offerData.carouselId = carouselId;
      offerData.products = products;
      offerData.bundlePrice = parseFloat(bundlePrice);
      offerData.bundleQuantity = parseInt(bundleQuantity);
      offerData.carouselDisplayText = carouselDisplayText || '';
      // Add country-specific pricing if provided
      if (pricingByCountry && Array.isArray(pricingByCountry) && pricingByCountry.length > 0) {
        // Filter out empty entries
        const validPricingByCountry = pricingByCountry.filter(p => 
          p.country && p.currency && p.bundlePrice !== undefined && p.bundlePrice !== null && p.bundlePrice !== ''
        );
        if (validPricingByCountry.length > 0) {
          offerData.pricingByCountry = validPricingByCountry.map(p => ({
            country: p.country,
            currency: p.currency,
            bundlePrice: parseFloat(p.bundlePrice)
          }));
        }
      }
    }
    
    const offer = new Offer(offerData);
    await offer.save();
    
    // Populate products for response
    if (offerTypeValue === 'bundle' || offerTypeValue === 'carousel') {
      await offer.populate('products');
      if (offerTypeValue === 'carousel') {
        await offer.populate('carouselId');
      }
    }
    
    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Offer code already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update offer
router.put('/offers/:id', async (req, res) => {
  try {
    const { 
      code, 
      offerType,
      discount, 
      discountType, 
      description,
      couponDisplayText,
      isActive,
      showOnHomePage,
      // Bundle offer fields
      category,
      subcategories,
      products,
      bundlePrice,
      bundleQuantity,
      bundleDisplayText,
      // Carousel offer fields
      carouselId,
      carouselDisplayText,
      // Country-specific pricing
      pricingByCountry,
      discountByCountry
    } = req.body;
    
    const updateData = { updatedAt: new Date() };
    
    if (code) updateData.code = code.toUpperCase().trim();
    if (offerType) updateData.offerType = offerType;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (showOnHomePage !== undefined) updateData.showOnHomePage = showOnHomePage;
    
    // Handle coupon fields
    if (discount !== undefined) {
      if (discountType === 'percentage' && (discount < 0 || discount > 100)) {
        return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
      }
      if (discountType === 'fixed' && discount < 0) {
        return res.status(400).json({ message: 'Fixed discount cannot be negative' });
      }
      updateData.discount = discount;
    }
    if (discountType) updateData.discountType = discountType;
    if (couponDisplayText !== undefined) {
      updateData.couponDisplayText = couponDisplayText.trim();
    }
    
    // Handle country-specific discount for coupons
    if (discountByCountry !== undefined) {
      if (Array.isArray(discountByCountry) && discountByCountry.length > 0) {
        // Filter out empty entries and validate
        const validDiscountByCountry = discountByCountry.filter(d => {
          if (!d || !d.country || !d.currency) return false;
          const discount = parseFloat(d.discount);
          if (isNaN(discount) || discount < 0) return false;
          if (d.discountType === 'percentage' && discount > 100) return false;
          return true;
        });
        if (validDiscountByCountry.length > 0) {
          updateData.discountByCountry = validDiscountByCountry.map(d => ({
            country: d.country.trim(),
            currency: d.currency.trim(),
            discount: parseFloat(d.discount),
            discountType: d.discountType || 'percentage'
          }));
        } else {
          updateData.discountByCountry = [];
        }
      } else {
        // If empty array, clear the field
        updateData.discountByCountry = [];
      }
    }
    
    // Handle bundle fields
    if (category) updateData.category = category;
    if (subcategories !== undefined) updateData.subcategories = subcategories;
    if (products !== undefined) updateData.products = products;
    if (bundlePrice !== undefined) {
      const price = parseFloat(bundlePrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Bundle price cannot be negative' });
      }
      updateData.bundlePrice = price;
    }
    if (bundleQuantity !== undefined) {
      const quantity = parseInt(bundleQuantity);
      if (isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Bundle quantity must be at least 1' });
      }
      updateData.bundleQuantity = quantity;
    }
    if (bundleDisplayText !== undefined) {
      updateData.bundleDisplayText = bundleDisplayText.trim();
    }
    
    // Handle carousel fields
    if (carouselId !== undefined) updateData.carouselId = carouselId;
    if (carouselDisplayText !== undefined) {
      updateData.carouselDisplayText = carouselDisplayText.trim();
    }
    
    // Handle country-specific pricing for bundle/carousel offers
    if (pricingByCountry !== undefined) {
      if (Array.isArray(pricingByCountry) && pricingByCountry.length > 0) {
        // Filter out empty entries and validate
        const validPricingByCountry = pricingByCountry.filter(p => {
          if (!p || !p.country || !p.currency) return false;
          const price = parseFloat(p.bundlePrice);
          return !isNaN(price) && price >= 0;
        });
        if (validPricingByCountry.length > 0) {
          updateData.pricingByCountry = validPricingByCountry.map(p => ({
            country: p.country.trim(),
            currency: p.currency.trim(),
            bundlePrice: parseFloat(p.bundlePrice)
          }));
        } else {
          updateData.pricingByCountry = [];
        }
      } else {
        // If empty array, clear the field
        updateData.pricingByCountry = [];
      }
    }
    
    const offer = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Populate products for response if bundle or carousel
    if ((offer.offerType === 'bundle' || offer.offerType === 'carousel') && offer.products && offer.products.length > 0) {
      await offer.populate('products');
      if (offer.offerType === 'carousel') {
        await offer.populate('carouselId');
      }
    }
    
    res.json(offer);
  } catch (error) {
    console.error('Error updating offer:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Offer code already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete offer
router.delete('/offers/:id', async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Country Currency Management Routes

// Get all country currencies
router.get('/country-currencies', async (req, res) => {
  try {
    const CountryCurrency = require('../models/CountryCurrency');
    const countryCurrencies = await CountryCurrency.find().sort({ order: 1, country: 1 });
    res.json(countryCurrencies);
  } catch (error) {
    console.error('Error fetching country currencies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create country currency (admin only)
router.post('/country-currencies', auth, admin, async (req, res) => {
  try {
    const CountryCurrency = require('../models/CountryCurrency');
    const { country, countryCode, currency, currencySymbol, isActive, order } = req.body;
    
    if (!country || !countryCode || !currency || !currencySymbol) {
      return res.status(400).json({ message: 'Country, Country Code, Currency, and Currency Symbol are required' });
    }
    
    // Check if country or countryCode already exists
    const existing = await CountryCurrency.findOne({
      $or: [
        { country: country.trim() },
        { countryCode: countryCode.trim().toUpperCase() }
      ]
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Country or Country Code already exists' });
    }
    
    const countryCurrency = new CountryCurrency({
      country: country.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      currencySymbol: currencySymbol.trim(),
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });
    
    await countryCurrency.save();
    res.status(201).json(countryCurrency);
  } catch (error) {
    console.error('Error creating country currency:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Country or Country Code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update country currency (admin only)
router.put('/country-currencies/:id', auth, admin, async (req, res) => {
  try {
    const CountryCurrency = require('../models/CountryCurrency');
    const { country, countryCode, currency, currencySymbol, isActive, order } = req.body;
    
    const updateData = { updatedAt: new Date() };
    
    if (country !== undefined) updateData.country = country.trim();
    if (countryCode !== undefined) updateData.countryCode = countryCode.trim().toUpperCase();
    if (currency !== undefined) updateData.currency = currency.trim().toUpperCase();
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;
    
    // Check if country or countryCode already exists (excluding current record)
    if (country || countryCode) {
      const existing = await CountryCurrency.findOne({
        _id: { $ne: req.params.id },
        $or: [
          country ? { country: country.trim() } : {},
          countryCode ? { countryCode: countryCode.trim().toUpperCase() } : {}
        ]
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Country or Country Code already exists' });
      }
    }
    
    const countryCurrency = await CountryCurrency.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!countryCurrency) {
      return res.status(404).json({ message: 'Country Currency not found' });
    }
    
    res.json(countryCurrency);
  } catch (error) {
    console.error('Error updating country currency:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Country or Country Code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete country currency (admin only)
router.delete('/country-currencies/:id', auth, admin, async (req, res) => {
  try {
    const CountryCurrency = require('../models/CountryCurrency');
    const countryCurrency = await CountryCurrency.findByIdAndDelete(req.params.id);
    
    if (!countryCurrency) {
      return res.status(404).json({ message: 'Country Currency not found' });
    }
    
    res.json({ message: 'Country Currency deleted successfully' });
  } catch (error) {
    console.error('Error deleting country currency:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add demo reviews to all products (Admin only)
router.post('/reviews/add-demo', async (req, res) => {
  console.log('[ADD DEMO REVIEWS] Endpoint called');
  try {
    // Demo user names and comments pool (mix of international and Indian names)
    const demoUsers = [
      // International names
      { name: 'Alex Johnson', email: 'alex.johnson@demo.com' },
      { name: 'Sarah Williams', email: 'sarah.williams@demo.com' },
      { name: 'Michael Brown', email: 'michael.brown@demo.com' },
      { name: 'Emily Davis', email: 'emily.davis@demo.com' },
      { name: 'David Miller', email: 'david.miller@demo.com' },
      { name: 'Jessica Wilson', email: 'jessica.wilson@demo.com' },
      { name: 'James Moore', email: 'james.moore@demo.com' },
      { name: 'Olivia Taylor', email: 'olivia.taylor@demo.com' },
      { name: 'Robert Anderson', email: 'robert.anderson@demo.com' },
      { name: 'Sophia Thomas', email: 'sophia.thomas@demo.com' },
      // Indian names
      { name: 'Rahul Sharma', email: 'rahul.sharma@demo.com' },
      { name: 'Priya Patel', email: 'priya.patel@demo.com' },
      { name: 'Amit Kumar', email: 'amit.kumar@demo.com' },
      { name: 'Anjali Singh', email: 'anjali.singh@demo.com' },
      { name: 'Vikram Gupta', email: 'vikram.gupta@demo.com' },
      { name: 'Kavita Reddy', email: 'kavita.reddy@demo.com' },
      { name: 'Rajesh Mehta', email: 'rajesh.mehta@demo.com' },
      { name: 'Sneha Desai', email: 'sneha.desai@demo.com' },
      { name: 'Arjun Joshi', email: 'arjun.joshi@demo.com' },
      { name: 'Divya Iyer', email: 'divya.iyer@demo.com' },
      { name: 'Suresh Nair', email: 'suresh.nair@demo.com' },
      { name: 'Meera Menon', email: 'meera.menon@demo.com' },
      { name: 'Karan Malhotra', email: 'karan.malhotra@demo.com' },
      { name: 'Pooja Agarwal', email: 'pooja.agarwal@demo.com' },
      { name: 'Rohan Kapoor', email: 'rohan.kapoor@demo.com' },
      { name: 'Neha Choudhury', email: 'neha.choudhury@demo.com' },
      { name: 'Aditya Verma', email: 'aditya.verma@demo.com' },
      { name: 'Shreya Banerjee', email: 'shreya.banerjee@demo.com' },
      { name: 'Vivek Tiwari', email: 'vivek.tiwari@demo.com' },
      { name: 'Riya Shah', email: 'riya.shah@demo.com' },
      { name: 'Nikhil Agarwal', email: 'nikhil.agarwal@demo.com' },
      { name: 'Ananya Rao', email: 'ananya.rao@demo.com' },
      { name: 'Siddharth Jain', email: 'siddharth.jain@demo.com' },
      { name: 'Isha Trivedi', email: 'isha.trivedi@demo.com' },
      { name: 'Manish Pandey', email: 'manish.pandey@demo.com' },
      { name: 'Swati Mishra', email: 'swati.mishra@demo.com' },
      { name: 'Harsh Varma', email: 'harsh.varma@demo.com' },
      { name: 'Tanvi Nanda', email: 'tanvi.nanda@demo.com' }
    ];

    const reviewComments = [
      'Great quality! The fabric is soft and comfortable. Highly recommend!',
      'Love the design and fit. Perfect for everyday wear.',
      'Excellent product! Fast shipping and great customer service.',
      'Very satisfied with my purchase. The quality exceeded my expectations.',
      'Amazing value for money. Will definitely order again!',
      'Perfect fit and great quality. Very happy with this purchase.',
      'Beautiful design and comfortable material. Highly recommend!',
      'Great product! The colors are vibrant and the quality is top-notch.',
      'Very pleased with this purchase. The sizing was accurate.',
      'Excellent quality and fast delivery. Will shop here again!',
      'Love it! The material is soft and the design is stylish.',
      'Great value! The product looks exactly as described.',
      'Very comfortable and well-made. Highly satisfied!',
      'Perfect! The quality is excellent and the fit is just right.',
      'Amazing product! Fast shipping and great packaging.',
      'Love the style and quality. Will definitely buy more!',
      'Excellent purchase! The product exceeded my expectations.',
      'Great quality fabric and perfect fit. Very happy!',
      'Beautiful product! The design is modern and stylish.',
      'Very satisfied! The quality is excellent and delivery was fast.',
      'Perfect fit and great quality. Highly recommend this product!',
      'Love it! The material is comfortable and the design is trendy.',
      'Excellent value for money. Great quality and fast shipping.',
      'Very pleased with the quality. Will order again soon!',
      'Amazing product! The colors are vibrant and the fit is perfect.',
      // Reviews with Indian context/style
      'Bahut accha product hai! Quality bilkul perfect hai. Highly recommend!',
      'Superb quality! The fabric is very comfortable for Indian weather.',
      'Excellent product! Delivery was very fast and packaging was great.',
      'Perfect fit! The size chart was accurate. Very happy with purchase.',
      'Great value for money! Quality is much better than expected.',
      'Love the design! Perfect for Indian festivals and occasions.',
      'Very good quality material. Comfortable to wear all day.',
      'Amazing product! The colors are bright and beautiful.',
      'Excellent purchase! The product looks exactly like the pictures.',
      'Great quality! Will definitely recommend to friends and family.',
      'Perfect for daily wear! The fabric is soft and durable.',
      'Very satisfied with the quality and fast delivery service.',
      'Love it! The design is modern and suits Indian style perfectly.',
      'Excellent value! The product quality is outstanding.',
      'Great product! Fast shipping and excellent customer support.',
      'Perfect fit and great quality! Very happy with my purchase.',
      'Amazing quality! The material is premium and comfortable.',
      'Excellent product! The colors are vibrant and long-lasting.',
      'Very pleased! The sizing was perfect and quality is top-notch.',
      'Great purchase! Will definitely order more products from here.'
    ];

    // Create or get demo users
    const demoUserIds = [];
    for (const demoUser of demoUsers) {
      let user = await User.findOne({ email: demoUser.email });
      if (!user) {
        user = new User({
          name: demoUser.name,
          email: demoUser.email,
          password: 'demo123', // Will be hashed by pre-save hook
          role: 'user'
        });
        await user.save();
      }
      demoUserIds.push(user._id);
    }

    // Get all active products
    const products = await Product.find({ isActive: true });
    
    let totalReviewsCreated = 0;
    const results = [];

    // Track used combinations globally to avoid repetition across products
    const usedCombinations = new Set(); // Format: "userId-commentIndex"
    
    // Create arrays of available indices for better distribution
    const availableUserIndices = Array.from({ length: demoUserIds.length }, (_, i) => i);
    const availableCommentIndices = Array.from({ length: reviewComments.length }, (_, i) => i);
    
    // Shuffle arrays for random distribution
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    let shuffledUserIndices = shuffleArray(availableUserIndices);
    let shuffledCommentIndices = shuffleArray(availableCommentIndices);
    let userIndexPointer = 0;
    let commentIndexPointer = 0;

    // Calculate total reviews to create for date sequencing
    let totalReviewsToCreate = 0;
    for (const product of products) {
      const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews per product
      totalReviewsToCreate += numReviews;
    }

    // Generate sequential dates from today going backwards (newest to oldest)
    // This ensures latest reviews appear at top when sorted by createdAt: -1
    const now = new Date();
    const daysBack = 30; // Spread reviews over last 30 days
    const dateIncrement = (daysBack * 24 * 60 * 60 * 1000) / totalReviewsToCreate; // Milliseconds per review
    let currentDateIndex = 0;

    // For each product, create 3-5 different reviews
    for (const product of products) {
      const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews per product
      const usedUserIndices = new Set();
      const usedCommentIndices = new Set();
      
      for (let i = 0; i < numReviews; i++) {
        // Get a unique user (not used for this product yet, and try to avoid repetition across products)
        let userIndex;
        let attempts = 0;
        do {
          // If we've used all users, reset the shuffled array
          if (userIndexPointer >= shuffledUserIndices.length) {
            shuffledUserIndices = shuffleArray(availableUserIndices);
            userIndexPointer = 0;
          }
          userIndex = shuffledUserIndices[userIndexPointer++];
          attempts++;
        } while (usedUserIndices.has(userIndex) && attempts < demoUserIds.length * 2);
        
        // If still duplicate within product, pick randomly from unused
        if (usedUserIndices.has(userIndex)) {
          const unusedUsers = availableUserIndices.filter(idx => !usedUserIndices.has(idx));
          if (unusedUsers.length > 0) {
            userIndex = unusedUsers[Math.floor(Math.random() * unusedUsers.length)];
          }
        }
        usedUserIndices.add(userIndex);
        
        // Get a unique comment (not used for this product yet, and try to avoid repetition across products)
        let commentIndex;
        attempts = 0;
        do {
          // If we've used all comments, reset the shuffled array
          if (commentIndexPointer >= shuffledCommentIndices.length) {
            shuffledCommentIndices = shuffleArray(availableCommentIndices);
            commentIndexPointer = 0;
          }
          commentIndex = shuffledCommentIndices[commentIndexPointer++];
          attempts++;
        } while (usedCommentIndices.has(commentIndex) && attempts < reviewComments.length * 2);
        
        // If still duplicate within product, pick randomly from unused
        if (usedCommentIndices.has(commentIndex)) {
          const unusedComments = availableCommentIndices.filter(idx => !usedCommentIndices.has(idx));
          if (unusedComments.length > 0) {
            commentIndex = unusedComments[Math.floor(Math.random() * unusedComments.length)];
          }
        }
        usedCommentIndices.add(commentIndex);
        
        // Check if this exact combination (user-comment) has been used before
        const combinationKey = `${userIndex}-${commentIndex}`;
        if (usedCombinations.has(combinationKey)) {
          // Find an alternative comment that hasn't been used with this user
          const alternativeComments = availableCommentIndices.filter(
            idx => !usedCombinations.has(`${userIndex}-${idx}`) && !usedCommentIndices.has(idx)
          );
          if (alternativeComments.length > 0) {
            commentIndex = alternativeComments[Math.floor(Math.random() * alternativeComments.length)];
          } else {
            // If no alternative, find alternative user
            const alternativeUsers = availableUserIndices.filter(
              idx => !usedCombinations.has(`${idx}-${commentIndex}`) && !usedUserIndices.has(idx)
            );
            if (alternativeUsers.length > 0) {
              userIndex = alternativeUsers[Math.floor(Math.random() * alternativeUsers.length)];
              usedUserIndices.delete(usedUserIndices.has(userIndex) ? userIndex : null);
              usedUserIndices.add(userIndex);
            }
          }
        }
        
        // Mark this combination as used
        usedCombinations.add(`${userIndex}-${commentIndex}`);
        
        // Random rating (mostly positive, but some variation)
        const rating = Math.random() < 0.7 ? 
          Math.floor(Math.random() * 2) + 4 : // 70% chance of 4-5 stars
          Math.floor(Math.random() * 3) + 2;  // 30% chance of 2-4 stars
        
        // Create review with sequential date (newest to oldest, so latest appear at top)
        // Start from today and go backwards in time
        const reviewDate = new Date(now.getTime() - (currentDateIndex * dateIncrement));
        currentDateIndex++;
        
        // Create review
        const review = new Review({
          user: demoUserIds[userIndex],
          product: product._id,
          rating: rating,
          comment: reviewComments[commentIndex],
          isApproved: true, // Auto-approve demo reviews
          isDisabled: false,
          createdAt: reviewDate // Sequential date for proper ordering
        });
        
        await review.save();
        totalReviewsCreated++;
      }
      
      // Update product rating
      const allReviews = await Review.find({ 
        product: product._id,
        isApproved: true,
        isDisabled: false
      });
      
      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        product.rating = Math.round(avgRating * 10) / 10;
        product.numReviews = allReviews.length;
        await product.save();
      }
      
      results.push({
        product: product.name,
        reviewsAdded: numReviews
      });
    }

    res.json({
      success: true,
      message: `Successfully added ${totalReviewsCreated} demo reviews to ${products.length} products`,
      totalReviewsCreated,
      productsUpdated: products.length,
      details: results
    });
  } catch (error) {
    console.error('Error adding demo reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all demo reviews (Admin only)
router.delete('/reviews/demo', async (req, res) => {
  try {
    // Find all demo users by their email pattern
    const demoUserEmails = [
      'alex.johnson@demo.com', 'sarah.williams@demo.com', 'michael.brown@demo.com',
      'emily.davis@demo.com', 'david.miller@demo.com', 'jessica.wilson@demo.com',
      'james.moore@demo.com', 'olivia.taylor@demo.com', 'robert.anderson@demo.com',
      'sophia.thomas@demo.com', 'william.jackson@demo.com', 'isabella.white@demo.com',
      'daniel.harris@demo.com', 'ava.martin@demo.com', 'matthew.thompson@demo.com',
      'rahul.sharma@demo.com', 'priya.patel@demo.com', 'amit.kumar@demo.com',
      'anjali.singh@demo.com', 'vikram.gupta@demo.com', 'kavita.reddy@demo.com',
      'rajesh.mehta@demo.com', 'sneha.desai@demo.com', 'arjun.joshi@demo.com',
      'divya.iyer@demo.com', 'suresh.nair@demo.com', 'meera.menon@demo.com',
      'karan.malhotra@demo.com', 'pooja.agarwal@demo.com', 'rohan.kapoor@demo.com',
      'neha.choudhury@demo.com', 'aditya.verma@demo.com', 'shreya.banerjee@demo.com',
      'vivek.tiwari@demo.com', 'riya.shah@demo.com', 'nikhil.agarwal@demo.com',
      'ananya.rao@demo.com', 'siddharth.jain@demo.com', 'isha.trivedi@demo.com',
      'manish.pandey@demo.com', 'swati.mishra@demo.com', 'harsh.varma@demo.com',
      'tanvi.nanda@demo.com'
    ];

    // Find all demo users
    const demoUsers = await User.find({ email: { $in: demoUserEmails } });
    const demoUserIds = demoUsers.map(u => u._id);

    if (demoUserIds.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No demo reviews found',
        deletedCount: 0 
      });
    }

    // Delete all reviews from demo users
    const deleteResult = await Review.deleteMany({ user: { $in: demoUserIds } });
    const deletedCount = deleteResult.deletedCount;

    // Update all products that had demo reviews
    const products = await Product.find({});
    for (const product of products) {
      const allReviews = await Review.find({ 
        product: product._id,
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

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} demo reviews`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Error deleting demo reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


