const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const { auth } = require('../middleware/auth');

// Get user cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size && item.color === color
    );

    // Get price based on size if sizes exist
    let itemPrice = product.discountPrice || product.price;
    if (product.sizes && product.sizes.length > 0 && size) {
      const sizeObj = product.sizes.find(s => {
        // Handle both old format (string) and new format (object)
        const sizeValue = typeof s === 'string' ? s : s.size;
        return sizeValue === size;
      });
      
      if (sizeObj && typeof sizeObj === 'object') {
        itemPrice = sizeObj.discountPrice || sizeObj.price;
      }
    }

    // Get color-specific image if color is selected
    let selectedImage = null;
    if (color && product.colors && product.colors.length > 0) {
      const colorObj = product.colors.find(c => {
        const colorName = typeof c === 'string' ? c : c.color;
        return colorName === color;
      });
      
      if (colorObj && typeof colorObj === 'object' && colorObj.images && colorObj.images.length > 0) {
        selectedImage = colorObj.images[0];
      }
    }
    
    // Fall back to first product image if no color-specific image found
    if (!selectedImage && product.images && product.images.length > 0) {
      selectedImage = product.images[0];
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      // Update price in case it changed
      cart.items[existingItemIndex].price = itemPrice;
      // Update selected image in case it changed
      if (selectedImage) {
        cart.items[existingItemIndex].selectedImage = selectedImage;
      }
    } else {
      cart.items.push({
        product: productId,
        quantity,
        size,
        color,
        selectedImage,
        price: itemPrice
      });
    }

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    await cart.populate('items.product');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update cart item
router.put('/update/:itemId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.quantity = quantity;
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    await cart.populate('items.product');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove from cart
router.delete('/remove/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    await cart.populate('items.product');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      cart.total = 0;
      await cart.save();
    }
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check for applicable bundle offers
router.get('/bundle-offers', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.json({ applicableOffers: [] });
    }

    // Get all active bundle offers
    const bundleOffers = await Offer.find({ 
      offerType: 'bundle',
      isActive: true 
    }).populate('products');

    const applicableOffers = [];

    for (const offer of bundleOffers) {
      // Get offer product IDs
      const offerProductIds = offer.products.map(p => p._id.toString());
      
      // Find cart items that match bundle offer products
      const bundleProductsInCart = cart.items.filter(item => {
        const productId = item.product._id.toString();
        return offerProductIds.includes(productId);
      });

      if (bundleProductsInCart.length === 0) {
        continue; // No bundle products in cart
      }

      // Check category filter if specified
      if (offer.category) {
        const categoryMatches = bundleProductsInCart.filter(item =>
          item.product.category === offer.category
        );
        
        if (categoryMatches.length === 0) {
          continue; // No products from required category
        }
        
        // Check subcategory filter if specified
        if (offer.subcategories && offer.subcategories.length > 0) {
          const subcategoryMatches = categoryMatches.filter(item =>
            offer.subcategories.includes(item.product.subcategory)
          );
          
          if (subcategoryMatches.length === 0) {
            continue; // No products from required subcategories
          }
          
          // Use subcategory-filtered products
          const matchingProducts = subcategoryMatches.filter(item =>
            offerProductIds.includes(item.product._id.toString())
          );
          
          // Check if cart has required quantity
          const totalQuantity = matchingProducts.reduce((sum, item) => sum + item.quantity, 0);
          if (matchingProducts.length > 0 && totalQuantity >= (offer.bundleQuantity || 1)) {
            applicableOffers.push({
              offer,
              matchingProducts: matchingProducts.map(item => ({
                productId: item.product._id.toString(),
                productName: item.product.name,
                quantity: item.quantity
              })),
              bundlePrice: offer.bundlePrice,
              bundleQuantity: offer.bundleQuantity || 1,
              originalTotal: matchingProducts.reduce((sum, item) => 
                sum + (item.price * item.quantity), 0
              )
            });
          }
        } else {
          // No subcategory filter, use all category matches
          const matchingProducts = categoryMatches.filter(item =>
            offerProductIds.includes(item.product._id.toString())
          );
          
          // Check if cart has required quantity
          const totalQuantity = matchingProducts.reduce((sum, item) => sum + item.quantity, 0);
          if (matchingProducts.length > 0 && totalQuantity >= (offer.bundleQuantity || 1)) {
            applicableOffers.push({
              offer,
              matchingProducts: matchingProducts.map(item => ({
                productId: item.product._id.toString(),
                productName: item.product.name,
                quantity: item.quantity
              })),
              bundlePrice: offer.bundlePrice,
              bundleQuantity: offer.bundleQuantity || 1,
              originalTotal: matchingProducts.reduce((sum, item) => 
                sum + (item.price * item.quantity), 0
              )
            });
          }
        }
      } else {
        // No category filter, use all matching products
        const totalQuantity = bundleProductsInCart.reduce((sum, item) => sum + item.quantity, 0);
        if (bundleProductsInCart.length > 0 && totalQuantity >= (offer.bundleQuantity || 1)) {
          applicableOffers.push({
            offer,
            matchingProducts: bundleProductsInCart.map(item => ({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: item.quantity
            })),
            bundlePrice: offer.bundlePrice,
            bundleQuantity: offer.bundleQuantity || 1,
            originalTotal: bundleProductsInCart.reduce((sum, item) => 
              sum + (item.price * item.quantity), 0
            )
          });
        }
      }
    }

    res.json({ applicableOffers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


