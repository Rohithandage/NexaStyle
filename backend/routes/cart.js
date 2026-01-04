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

// Check for applicable bundle and carousel offers
router.get('/bundle-offers', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.json({ applicableOffers: [] });
    }

    // Get all active bundle and carousel offers
    const bundleOffers = await Offer.find({ 
      offerType: { $in: ['bundle', 'carousel'] },
      isActive: true 
    }).populate('products').populate('carouselId');

    console.log('Found offers:', bundleOffers.length, bundleOffers.map(o => ({ type: o.offerType, code: o.code, productsCount: o.products?.length })));

    const applicableOffers = [];

    for (const offer of bundleOffers) {
      console.log(`Processing offer: ${offer.code}, type: ${offer.offerType}, products: ${offer.products?.length || 0}`);
      // Get offer product IDs
      const offerProductIds = offer.products.map(p => p._id.toString());
      
      // Find cart items that match offer products
      const cartProductIds = cart.items.map(item => item.product._id.toString());
      console.log(`Cart product IDs:`, cartProductIds);
      
      const matchingProductsInCart = cart.items.filter(item => {
        const productId = item.product._id.toString();
        const matches = offerProductIds.includes(productId);
        if (matches) {
          console.log(`Match found: Product ${productId} is in offer ${offer.code}`);
        }
        return matches;
      });

      console.log(`Offer ${offer.code}: ${matchingProductsInCart.length} matching products in cart`);

      if (matchingProductsInCart.length === 0) {
        console.log(`Offer ${offer.code}: No matching products in cart, skipping`);
        continue; // No matching products in cart
      }

      // Helper function to calculate bundle breakdown (which products get bundle price vs original price)
      const calculateBundleBreakdown = (matchingProducts, requiredQuantity) => {
        const totalQuantity = matchingProducts.reduce((sum, item) => sum + item.quantity, 0);
        const numberOfBundles = Math.floor(totalQuantity / requiredQuantity);
        const remainingQuantity = totalQuantity % requiredQuantity;
        
        const bundleProducts = []; // Products that get bundle pricing
        const originalPriceProducts = []; // Products that stay at original price
        let remainingForBundle = numberOfBundles * requiredQuantity;
        
        // Allocate products to bundles
        for (const item of matchingProducts) {
          if (remainingForBundle <= 0) {
            // All remaining quantities stay at original price
            if (item.quantity > 0) {
              originalPriceProducts.push({
                productId: item.product._id.toString(),
                productName: item.product.name,
                quantity: item.quantity,
                price: item.price
              });
            }
            continue;
          }
          
          const quantityForBundle = Math.min(item.quantity, remainingForBundle);
          const quantityForOriginal = item.quantity - quantityForBundle;
          
          if (quantityForBundle > 0) {
            bundleProducts.push({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: quantityForBundle,
              price: item.price
            });
          }
          
          if (quantityForOriginal > 0) {
            originalPriceProducts.push({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: quantityForOriginal,
              price: item.price
            });
          }
          
          remainingForBundle -= quantityForBundle;
        }
        
        const bundleTotal = bundleProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const originalTotal = matchingProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalBundlePrice = numberOfBundles * offer.bundlePrice;
        
        return {
          bundleProducts,
          originalPriceProducts,
          bundleTotal,
          originalTotal,
          numberOfBundles,
          totalBundlePrice
        };
      };

      // Handle carousel offers (no category/subcategory filters)
      if (offer.offerType === 'carousel') {
        console.log(`Carousel offer ${offer.code}: matching products in cart: ${matchingProductsInCart.length}`);
        const totalQuantity = matchingProductsInCart.reduce((sum, item) => sum + item.quantity, 0);
        const requiredQuantity = offer.bundleQuantity || 1;
        console.log(`Carousel offer ${offer.code}: total quantity: ${totalQuantity}, required: ${requiredQuantity}`);
        if (matchingProductsInCart.length > 0 && totalQuantity >= requiredQuantity) {
          const breakdown = calculateBundleBreakdown(matchingProductsInCart, requiredQuantity);
          console.log(`Carousel offer ${offer.code}: Adding to applicable offers. Bundles: ${breakdown.numberOfBundles}, Bundle products: ${breakdown.bundleProducts.length}, Original price products: ${breakdown.originalPriceProducts.length}`);
          applicableOffers.push({
            offer,
            matchingProducts: matchingProductsInCart.map(item => ({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: item.quantity
            })),
            bundleProducts: breakdown.bundleProducts,
            originalPriceProducts: breakdown.originalPriceProducts,
            bundlePrice: offer.bundlePrice,
            bundleQuantity: requiredQuantity,
            numberOfBundles: breakdown.numberOfBundles,
            totalBundlePrice: breakdown.totalBundlePrice,
            originalTotal: breakdown.originalTotal,
            bundleTotal: breakdown.bundleTotal
          });
        } else {
          console.log(`Carousel offer ${offer.code}: Not applicable - quantity requirement not met`);
        }
        continue; // Skip category/subcategory checks for carousel offers
      }

      // Handle bundle offers (with category/subcategory filters)
      // Check category filter if specified
      if (offer.category) {
        const categoryMatches = matchingProductsInCart.filter(item =>
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
          const requiredQuantity = offer.bundleQuantity || 1;
          if (matchingProducts.length > 0 && totalQuantity >= requiredQuantity) {
            const breakdown = calculateBundleBreakdown(matchingProducts, requiredQuantity);
            applicableOffers.push({
              offer,
              matchingProducts: matchingProducts.map(item => ({
                productId: item.product._id.toString(),
                productName: item.product.name,
                quantity: item.quantity
              })),
              bundleProducts: breakdown.bundleProducts,
              originalPriceProducts: breakdown.originalPriceProducts,
              bundlePrice: offer.bundlePrice,
              bundleQuantity: requiredQuantity,
              numberOfBundles: breakdown.numberOfBundles,
              totalBundlePrice: breakdown.totalBundlePrice,
              originalTotal: breakdown.originalTotal,
              bundleTotal: breakdown.bundleTotal
            });
          }
        } else {
          // No subcategory filter, use all category matches
          const matchingProducts = categoryMatches.filter(item =>
            offerProductIds.includes(item.product._id.toString())
          );
          
          // Check if cart has required quantity
          const totalQuantity = matchingProducts.reduce((sum, item) => sum + item.quantity, 0);
          const requiredQuantity = offer.bundleQuantity || 1;
          if (matchingProducts.length > 0 && totalQuantity >= requiredQuantity) {
            const breakdown = calculateBundleBreakdown(matchingProducts, requiredQuantity);
            applicableOffers.push({
              offer,
              matchingProducts: matchingProducts.map(item => ({
                productId: item.product._id.toString(),
                productName: item.product.name,
                quantity: item.quantity
              })),
              bundleProducts: breakdown.bundleProducts,
              originalPriceProducts: breakdown.originalPriceProducts,
              bundlePrice: offer.bundlePrice,
              bundleQuantity: requiredQuantity,
              numberOfBundles: breakdown.numberOfBundles,
              totalBundlePrice: breakdown.totalBundlePrice,
              originalTotal: breakdown.originalTotal,
              bundleTotal: breakdown.bundleTotal
            });
          }
        }
      } else {
        // No category filter, use all matching products
        const totalQuantity = matchingProductsInCart.reduce((sum, item) => sum + item.quantity, 0);
        const requiredQuantity = offer.bundleQuantity || 1;
        if (matchingProductsInCart.length > 0 && totalQuantity >= requiredQuantity) {
          const breakdown = calculateBundleBreakdown(matchingProductsInCart, requiredQuantity);
          applicableOffers.push({
            offer,
            matchingProducts: matchingProductsInCart.map(item => ({
              productId: item.product._id.toString(),
              productName: item.product.name,
              quantity: item.quantity
            })),
            bundleProducts: breakdown.bundleProducts,
            originalPriceProducts: breakdown.originalPriceProducts,
            bundlePrice: offer.bundlePrice,
            bundleQuantity: requiredQuantity,
            numberOfBundles: breakdown.numberOfBundles,
            totalBundlePrice: breakdown.totalBundlePrice,
            originalTotal: breakdown.originalTotal,
            bundleTotal: breakdown.bundleTotal
          });
        }
      }
    }

    console.log('Returning applicable offers:', applicableOffers.length);
    res.json({ applicableOffers });
  } catch (error) {
    console.error('Error in bundle-offers route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


