const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const Offer = require('../models/Offer');
const CarouselItem = require('../models/CarouselItem');
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
    const { imageUrl, name, buttonText, productIds, order } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    const carouselItem = new CarouselItem({
      imageUrl,
      name: name || 'Carousel Item',
      buttonText: buttonText || 'Shop Now',
      productIds: productIds || [],
      order: order || 0,
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
    const { imageUrl, name, buttonText, productIds, order, isActive } = req.body;
    
    const updateData = { updatedAt: new Date() };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (name !== undefined) updateData.name = name;
    if (buttonText !== undefined) updateData.buttonText = buttonText;
    if (productIds !== undefined) updateData.productIds = productIds;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    
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
      carouselDisplayText
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
    } else if (offerTypeValue === 'bundle') {
      offerData.category = category;
      offerData.subcategories = subcategories || [];
      offerData.products = products;
      offerData.bundlePrice = parseFloat(bundlePrice);
      offerData.bundleQuantity = parseInt(bundleQuantity);
      offerData.bundleDisplayText = bundleDisplayText || '';
    } else if (offerTypeValue === 'carousel') {
      offerData.carouselId = carouselId;
      offerData.products = products;
      offerData.bundlePrice = parseFloat(bundlePrice);
      offerData.bundleQuantity = parseInt(bundleQuantity);
      offerData.carouselDisplayText = carouselDisplayText || '';
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
      carouselDisplayText
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
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Offer code already exists' });
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

module.exports = router;


