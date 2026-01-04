import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiPlus, FiMinus } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../utils/config';
import './Checkout.css';

// Color name to hex mapping (same as ProductDetail and Cart)
const getColorValue = (colorName) => {
  // Handle null, undefined, or empty values
  if (!colorName || typeof colorName !== 'string') {
    return '#cccccc'; // Default gray color
  }
  
  const colorMap = {
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#008000',
    'yellow': '#ffff00',
    'black': '#000000',
    'white': '#ffffff',
    'gray': '#808080',
    'grey': '#808080',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'navy': '#000080',
    'navy blue': '#000080',
    'maroon': '#800000',
    'teal': '#008080',
    'cyan': '#00ffff',
    'lime': '#00ff00',
    'magenta': '#ff00ff',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
    'golden yellow': '#ffd700',
    'beige': '#f5f5dc',
    'tan': '#d2b48c',
    'olive': '#808000',
    'olive green': '#808000',
    'coral': '#ff7f50',
    'salmon': '#fa8072',
    'turquoise': '#40e0d0',
    'violet': '#ee82ee',
    'indigo': '#4b0082',
    'khaki': '#f0e68c',
    'lavender': '#e6e6fa',
    'plum': '#dda0dd',
    'crimson': '#dc143c',
    'azure': '#f0ffff',
    'ivory': '#fffff0',
    'cream': '#fffdd0',
    'royal blue': '#4169e1',
    'petrol blue': '#008080',
    'steel blue': '#4682b4',
    'sky blue light': '#87ceeb',
    'grey melange': '#a0a0a0',
    'light yellow': '#ffffe0',
    'mustard yellow': '#ffdb58',
    'pista': '#90ee90',
    'coffee brown': '#6f4e37',
    'flamingo': '#fc8eac',
    'slate grey': '#708090',
    'baby pink': '#f4c2c2',
    'charcoal melange': '#36454f',
    'aqua blue': '#00ffff',
    'parrot green': '#50c878',
    'peach': '#ffdab9'
  };
  
  const normalized = colorName.toLowerCase().trim();
  // Try exact match first
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }
  // Try partial match for compound colors
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return colorName; // Return original if not found
};

const Checkout = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [codCharges, setCodCharges] = useState(0);
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    streetAddress: '',
    phone: '',
    state: '',
    townCity: '',
    postcode: '',
    country: 'India'
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [offers, setOffers] = useState([]);
  const [dismissedOffers, setDismissedOffers] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [bundleOffers, setBundleOffers] = useState([]);
  const [appliedBundleOffer, setAppliedBundleOffer] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
    fetchCodCharges();
    fetchOffers();
    
    // Detect mobile device safely
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
    
    // Listen for cart updates from other pages
    const handleCartUpdate = () => {
      fetchCart(false); // Don't show empty message on refresh
    };
    
    // Listen for cart update events
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    // Also refresh when page regains focus (in case cart was modified in another tab)
    const handleFocus = () => {
      fetchCart(false); // Don't show empty message on refresh
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      fetchBundleOffers();
    } else {
      setBundleOffers([]);
      setAppliedBundleOffer(null);
      // If cart becomes empty, redirect to cart page
      if (cart && (!cart.items || cart.items.length === 0)) {
        toast.info('Your cart is empty');
        navigate('/cart');
      }
    }
  }, [cart, navigate]);

  const fetchCart = async (showEmptyMessage = true) => {
    try {
      const res = await api.get('/api/cart', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCart(res.data);
      if (!res.data || res.data.items.length === 0) {
        if (showEmptyMessage) {
          toast.info('Your cart is empty');
          navigate('/cart');
        }
      }
      // Return the cart data for chaining if needed
      return res.data;
    } catch (error) {
      toast.error('Error loading cart');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchCodCharges = async () => {
    try {
      const res = await api.get('/api/settings/cod-charges');
      setCodCharges(parseFloat(res.data.codCharges) || 0);
    } catch (error) {
      console.error('Error fetching COD charges:', error);
      // Set default to 0 if error
      setCodCharges(0);
    }
  };

  const fetchOffers = async () => {
    try {
      // Fetch all active coupon offers for checkout (not filtered by showOnHomePage)
      const res = await api.get('/api/settings/offers/checkout');
      const allOffers = res.data.offers || [];
      
      // Filter to only show active coupon offers
      const activeOffers = allOffers.filter(offer => offer.isActive && offer.offerType === 'coupon');
      setOffers(activeOffers);
      
      // Auto-apply coupon code from localStorage if available (silently)
      const pendingCouponCode = localStorage.getItem('pendingCouponCode');
      if (pendingCouponCode && activeOffers.length > 0) {
        const coupon = activeOffers.find(
          offer => offer.code.toUpperCase() === pendingCouponCode.toUpperCase()
        );
        if (coupon) {
          setAppliedCoupon(coupon);
          setCouponCode(coupon.code);
          // Keep in localStorage so Home page can show "Applied" status
          // Don't show toast - coupon was already applied from another page
          window.dispatchEvent(new Event('couponApplied'));
        } else {
          localStorage.removeItem('pendingCouponCode'); // Clear if invalid
        }
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const fetchBundleOffers = async () => {
    try {
      const res = await api.get('/api/cart/bundle-offers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const applicableOffers = res.data.applicableOffers || [];
      console.log('Fetched applicable offers:', applicableOffers.length, applicableOffers);
      console.log('Offer types:', applicableOffers.map(o => ({ code: o.offer?.code, type: o.offer?.offerType })));
      setBundleOffers(applicableOffers);
      
      // Check if currently applied bundle offer is still valid
      if (appliedBundleOffer) {
        const stillValid = applicableOffers.find(
          offer => offer.offer._id === appliedBundleOffer.offer._id
        );
        if (!stillValid) {
          // Offer is no longer valid, clear it
          setAppliedBundleOffer(null);
          toast.info('Bundle offer is no longer applicable');
        } else {
          // Update the applied offer with latest data
          setAppliedBundleOffer(stillValid);
          // Debug logging
          console.log('Updated bundle offer:', {
            bundleProducts: stillValid.bundleProducts,
            originalPriceProducts: stillValid.originalPriceProducts,
            totalBundlePrice: stillValid.totalBundlePrice || stillValid.bundlePrice,
            numberOfBundles: stillValid.numberOfBundles
          });
        }
      } else {
        // Auto-apply the first applicable bundle offer if available
        if (applicableOffers.length > 0) {
          setAppliedBundleOffer(applicableOffers[0]);
          const offerType = applicableOffers[0].offer?.offerType === 'carousel' ? 'Carousel' : 'Bundle';
          const savings = (applicableOffers[0].originalTotal - (applicableOffers[0].totalBundlePrice || applicableOffers[0].bundlePrice)).toFixed(2);
          toast.success(`${offerType} offer applied! Save ₹${savings}`);
          // Debug logging
          console.log('Applied bundle offer:', {
            bundleProducts: applicableOffers[0].bundleProducts,
            originalPriceProducts: applicableOffers[0].originalPriceProducts,
            totalBundlePrice: applicableOffers[0].totalBundlePrice || applicableOffers[0].bundlePrice,
            numberOfBundles: applicableOffers[0].numberOfBundles
          });
        }
      }
    } catch (error) {
      console.error('Error fetching bundle offers:', error);
    }
  };

  const handleDismissOffer = (offerId) => {
    setDismissedOffers([...dismissedOffers, offerId]);
  };

  // Color gradients for offer cards
  const offerColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  ];

  const getOfferColor = (index) => {
    return offerColors[index % offerColors.length];
  };

  // Filter to show only active coupon offers (already filtered in fetchOffers, but double-check)
  const visibleOffers = offers.filter(
    offer => offer.isActive && offer.offerType === 'coupon' && !dismissedOffers.includes(offer._id)
  );

  const handleApplyCoupon = (code = null) => {
    setCouponError('');
    const codeToApply = code || couponCode.trim();
    
    if (!codeToApply) {
      setCouponError('Please enter a coupon code');
      return;
    }

    const coupon = offers.find(
      offer => offer.isActive && offer.code.toUpperCase() === codeToApply.toUpperCase()
    );

    if (coupon) {
      // Check if already applied - toggle it off
      if (appliedCoupon && appliedCoupon.code.toUpperCase() === coupon.code.toUpperCase()) {
        // Remove the coupon
        setAppliedCoupon(null);
        setCouponCode('');
        localStorage.removeItem('pendingCouponCode');
        window.dispatchEvent(new Event('couponApplied'));
        toast.info(`Coupon ${coupon.code} removed`);
        return;
      }
      
      // Apply the coupon
      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
      // Store in localStorage so Home page can show "Applied" status
      localStorage.setItem('pendingCouponCode', coupon.code);
      window.dispatchEvent(new Event('couponApplied'));
      // Show minimal toast
      toast.success(`Coupon ${coupon.code} applied!`);
    } else {
      setCouponError('Invalid coupon code');
      toast.error('Invalid coupon code');
    }
  };

  const handleApplyOffer = (offer) => {
    handleApplyCoupon(offer.code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    localStorage.removeItem('pendingCouponCode');
    window.dispatchEvent(new Event('couponApplied'));
    toast.info('Coupon removed');
  };

  // Calculate subtotal with bundle pricing applied (before coupon and COD charges)
  // Example: 2 products at ₹399 each, bundle offer: 2 products at ₹499
  // - cart.total = ₹798 (all at original price)
  // - bundleProductsTotal = ₹798 (2 products that get bundle price)
  // - bundlePriceToApply = ₹499 (bundle price for 2 products)
  // - subtotal = ₹798 - ₹798 + ₹499 = ₹499 ✓
  //
  // Example: 3 products at ₹399 each, bundle offer: 2 products at ₹499
  // - cart.total = ₹1197 (all at original price)
  // - bundleProductsTotal = ₹798 (2 products that get bundle price)
  // - bundlePriceToApply = ₹499 (bundle price for 2 products)
  // - subtotal = ₹1197 - ₹798 + ₹499 = ₹898 ✓ (₹499 bundle + ₹399 original)
  //
  // Example: 4 products at ₹399 each, bundle offer: 2 products at ₹499
  // - cart.total = ₹1596 (all at original price)
  // - bundleProductsTotal = ₹1596 (4 products that get bundle price)
  // - bundlePriceToApply = ₹998 (2 bundles: ₹499 + ₹499)
  // - subtotal = ₹1596 - ₹1596 + ₹998 = ₹998 ✓ (₹499 + ₹499)
  const calculateSubtotal = () => {
    if (!cart) return 0;
    
    // Start with cart total (all products at original price)
    let subtotal = cart.total || 0;
    
    // Apply bundle pricing if applicable
    if (appliedBundleOffer && cart.items) {
      // Get matching product IDs from the offer
      const matchingProductIds = (appliedBundleOffer.matchingProducts || []).map(m => m.productId?.toString());
      
      // Calculate total for matching products at original price
      const matchingProductsTotal = cart.items.reduce((sum, item) => {
        const itemProductId = item.product?._id?.toString() || item.product?.toString();
        if (matchingProductIds.includes(itemProductId)) {
          return sum + (item.price * item.quantity);
        }
        return sum;
      }, 0);
      
      // Calculate total for products that get bundle pricing (at original price)
      const bundleProductsTotal = (appliedBundleOffer.bundleProducts || []).reduce((sum, bundleProduct) => {
        return sum + (bundleProduct.price * bundleProduct.quantity);
      }, 0);
      
      // Calculate total for products that stay at original price (excess quantities)
      const originalPriceProductsTotal = (appliedBundleOffer.originalPriceProducts || []).reduce((sum, origProduct) => {
        return sum + (origProduct.price * origProduct.quantity);
      }, 0);
      
      // Get total bundle price to apply
      const bundlePriceToApply = appliedBundleOffer.totalBundlePrice || appliedBundleOffer.bundlePrice;
      
      // Verify the breakdown is correct
      const breakdownTotal = bundleProductsTotal + originalPriceProductsTotal;
      if (Math.abs(breakdownTotal - matchingProductsTotal) > 0.01) {
        console.warn('Bundle breakdown mismatch!', {
          matchingProductsTotal,
          bundleProductsTotal,
          originalPriceProductsTotal,
          breakdownTotal
        });
      }
      
      // Formula: cart.total - bundleProductsTotal + bundlePriceToApply
      // 
      // Explanation:
      // - cart.total includes ALL products (matching + non-matching) at original price
      // - bundleProductsTotal = original price of products that get bundle pricing
      // - bundlePriceToApply = bundle price(s) to replace bundleProductsTotal
      // - originalPriceProductsTotal is already in cart.total, so it stays
      // - Non-matching products are also already in cart.total, so they stay
      //
      // Example: 3 products at ₹399 each, bundle offer: 2 products at ₹499
      // - cart.total = ₹1197 (all 3 at original price)
      // - matchingProductsTotal = ₹1197 (all 3 are matching)
      // - bundleProductsTotal = ₹798 (2 products × ₹399 that get bundle price)
      // - originalPriceProductsTotal = ₹399 (1 product × ₹399 that stays at original)
      // - bundlePriceToApply = ₹499 (bundle price for 2 products)
      // - subtotal = ₹1197 - ₹798 + ₹499 = ₹898 ✓ (₹499 bundle + ₹399 original)
      
      // Debug logging BEFORE calculation
      console.log('=== Subtotal Calculation Debug ===');
      console.log('Cart total:', cart.total);
      console.log('Matching products total:', matchingProductsTotal);
      console.log('Bundle products (from backend):', JSON.stringify(appliedBundleOffer.bundleProducts, null, 2));
      console.log('Original price products (from backend):', JSON.stringify(appliedBundleOffer.originalPriceProducts, null, 2));
      console.log('Bundle products total (to subtract):', bundleProductsTotal);
      console.log('Original price products total:', originalPriceProductsTotal);
      console.log('Bundle price to apply:', bundlePriceToApply);
      console.log('Number of bundles:', appliedBundleOffer.numberOfBundles);
      
      // The key issue: We need to ensure bundleProductsTotal only includes products that get bundle pricing
      // If bundleProducts contains all products, we need to recalculate based on numberOfBundles
      const requiredQuantity = appliedBundleOffer.bundleQuantity || 1;
      const numberOfBundles = appliedBundleOffer.numberOfBundles || 1;
      
      // Recalculate bundleProductsTotal to ensure it's correct
      // Only count the products that actually get bundle pricing (numberOfBundles * requiredQuantity)
      let recalculatedBundleProductsTotal = 0;
      let remainingForBundle = numberOfBundles * requiredQuantity;
      
      // Iterate through cart items and calculate which quantities get bundle pricing
      for (const item of cart.items) {
        const itemProductId = item.product?._id?.toString() || item.product?.toString();
        if (matchingProductIds.includes(itemProductId) && remainingForBundle > 0) {
          const quantityForBundle = Math.min(item.quantity, remainingForBundle);
          recalculatedBundleProductsTotal += item.price * quantityForBundle;
          remainingForBundle -= quantityForBundle;
        }
      }
      
      console.log('Recalculated bundle products total:', recalculatedBundleProductsTotal);
      console.log('Remaining for bundle after calculation:', remainingForBundle);
      
      // Use recalculated value (it's more accurate as it uses actual cart item prices)
      const finalBundleProductsTotal = recalculatedBundleProductsTotal > 0 ? recalculatedBundleProductsTotal : bundleProductsTotal;
      
      // Calculate subtotal: cart.total - products that get bundle pricing + bundle price
      // This ensures original price products (excess) remain in the total
      subtotal = subtotal - finalBundleProductsTotal + bundlePriceToApply;
      
      console.log('Final subtotal calculation:', {
        cartTotal: cart.total,
        finalBundleProductsTotal,
        bundlePriceToApply,
        calculatedSubtotal: subtotal
      });
      
      console.log('Final calculation:', {
        cartTotal: cart.total,
        finalBundleProductsTotal,
        bundlePriceToApply,
        calculatedSubtotal: subtotal
      });
      console.log('================================');
    }
    
    return subtotal;
  };

  // Calculate cart total with coupon discount and bundle pricing
  const calculateCartTotal = () => {
    if (!cart) return 0;
    
    let total = calculateSubtotal();
    
    // Ensure total is a valid number
    if (isNaN(total) || !isFinite(total)) {
      total = cart.total || 0;
    }
    
    // Apply coupon discount if applicable (on top of bundle pricing)
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        const discount = (total * appliedCoupon.discount) / 100;
        total = Math.max(0, total - discount);
      } else {
        total = Math.max(0, total - appliedCoupon.discount);
      }
    }
    
    if (paymentMethod === 'cod' && codCharges > 0) {
      total += codCharges;
    }
    
    console.log('=== Final Total Calculation ===');
    console.log('Subtotal after bundle:', calculateSubtotal());
    console.log('Coupon discount:', appliedCoupon ? (appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discount}%` : `₹${appliedCoupon.discount}`) : 'None');
    console.log('COD charges:', paymentMethod === 'cod' && codCharges > 0 ? codCharges : 0);
    console.log('Final total:', total);
    console.log('================================');
    
    return total || 0;
  };

  const handleInputChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await api.put(
        `/api/cart/update/${itemId}`,
        { quantity: newQuantity },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      // Refresh cart data
      const updatedCart = await fetchCart(false);
      // Manually trigger bundle offers refresh to ensure state updates immediately
      if (updatedCart && updatedCart.items && updatedCart.items.length > 0) {
        await fetchBundleOffers();
      }
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast.error('Error updating cart');
    }
  };

  // Lazy load Razorpay script ONLY when user clicks pay
  const loadRazorpay = () => {
    return new Promise((resolve, reject) => {
      // Guard window access
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'));
        return;
      }

      // If already loaded, resolve immediately
      if (window.Razorpay && typeof window.Razorpay === 'function') {
        resolve(true);
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="razorpay.com"]');
      if (existingScript) {
        // Wait for it to load
        existingScript.onload = () => resolve(true);
        existingScript.onerror = () => reject(new Error('Script load failed'));
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true; // Async for non-blocking
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Wait a bit for Razorpay to initialize
        setTimeout(() => {
          if (window.Razorpay && typeof window.Razorpay === 'function') {
            resolve(true);
          } else {
            reject(new Error('Razorpay not initialized'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay script'));
      };
      
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const res = await api.post(
        '/api/orders/create',
        {
          shippingAddress,
          paymentMethod,
          bundleOfferId: appliedBundleOffer?.offer._id,
          adjustedTotal: (() => {
            let total = cart?.total || 0;
            if (appliedBundleOffer) {
              // Calculate total for products that get bundle pricing (at original price)
              const bundleProductsTotal = (appliedBundleOffer.bundleProducts || []).reduce((sum, bundleProduct) => {
                const cartItem = cart.items.find(item => 
                  item.product._id === bundleProduct.productId || item.product._id.toString() === bundleProduct.productId
                );
                if (cartItem) {
                  return sum + (bundleProduct.price * bundleProduct.quantity);
                }
                return sum;
              }, 0);
              
              // Replace bundle products total with total bundle price
              // Use totalBundlePrice if available (for multiple bundles), otherwise use bundlePrice
              // Note: originalPriceProducts (excess) and non-matching products remain at original price (already in cart.total)
              const bundlePriceToApply = appliedBundleOffer.totalBundlePrice || appliedBundleOffer.bundlePrice;
              total = total - bundleProductsTotal + bundlePriceToApply;
            }
            return total;
          })(),
          couponCode: appliedCoupon?.code
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (paymentMethod === 'card' || paymentMethod === 'upi') {
        try {
          // Load Razorpay ONLY when user clicks pay (lazy loading)
          await loadRazorpay();
          
          // Guard window access
          if (typeof window === 'undefined' || !window.Razorpay) {
            throw new Error('Razorpay not available');
          }

          // Initialize Razorpay with mobile-optimized configuration
          const options = {
            key: res.data.razorpayKeyId,
            amount: res.data.order.totalAmount * 100,
            currency: 'INR',
            name: 'NexaStyle',
            description: 'Order Payment',
            order_id: res.data.razorpayOrderId,
            handler: async (response) => {
              try {
                const verifyRes = await api.post(
                  '/api/orders/verify-payment',
                  {
                    orderId: res.data.order._id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    razorpay_order_id: response.razorpay_order_id
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                  }
                );
                
                if (verifyRes.data.success) {
                  toast.success('Payment successful! Order placed.');
                  navigate('/orders');
                } else {
                  toast.error(verifyRes.data.message || 'Payment verification failed');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Payment verification failed';
                toast.error(errorMessage);
              }
            },
            modal: {
              ondismiss: () => {
                toast.info('Payment cancelled');
                setProcessing(false);
              },
              escape: true,
              animation: true
            },
            prefill: {
              name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
              email: '',
              contact: shippingAddress.phone
            },
            theme: {
              color: '#FF8C00'
            },
            // Mobile-specific optimizations
            ...(isMobile && {
              config: {
                display: {
                  blocks: {
                    banks: {
                      name: "All payment methods",
                      instruments: [
                        {
                          method: "card"
                        },
                        {
                          method: "netbanking"
                        },
                        {
                          method: "wallet"
                        },
                        {
                          method: "upi"
                        }
                      ]
                    }
                  },
                  sequence: ["block.banks"],
                  preferences: {
                    show_default_blocks: true
                  }
                }
              },
              retry: {
                enabled: true,
                max_count: 4
              }
            })
          };

          const razorpay = new window.Razorpay(options);
          
          // Add event listeners for better error handling
          razorpay.on('payment.failed', function (response) {
            console.error('Payment failed:', response);
            toast.error(`Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}`);
            setProcessing(false);
          });
          
          razorpay.on('payment.authorized', function (response) {
            console.log('Payment authorized:', response);
          });
          
          // Open Razorpay modal with small delay on mobile
          if (isMobile) {
            setTimeout(() => {
              razorpay.open();
            }, 100);
          } else {
            razorpay.open();
          }
        } catch (error) {
          console.error('Razorpay error:', error);
          toast.error(error.message || 'Failed to initialize payment gateway. Please try again.');
          setProcessing(false);
        }
      } else if (paymentMethod === 'cod') {
        // For COD orders, clear cart and navigate to orders
        toast.success('Order placed successfully! You will pay on delivery.');
        navigate('/orders');
      } else {
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error placing order';
      toast.error(errorMessage);
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>
        <div className="checkout-content">
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-section">
              <h2>Shipping Address</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={shippingAddress.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={shippingAddress.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Street Address *</label>
                <textarea
                  name="streetAddress"
                  value={shippingAddress.streetAddress}
                  onChange={handleInputChange}
                  placeholder="Enter your complete street address"
                  required
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>State *</label>
                  <select
                    name="state"
                    value={shippingAddress.state}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Town / City *</label>
                  <input
                    type="text"
                    name="townCity"
                    value={shippingAddress.townCity}
                    onChange={handleInputChange}
                    placeholder="Enter your city"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Country *</label>
                <select
                  name="country"
                  value={shippingAddress.country}
                  onChange={handleInputChange}
                  required
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Postcode / ZIP *</label>
                <input
                  type="text"
                  name="postcode"
                  value={shippingAddress.postcode}
                  onChange={handleInputChange}
                  placeholder="Enter postal code"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={shippingAddress.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            {/* Bundle & Carousel Offers Section */}
            {bundleOffers.length > 0 && (
              <div className="form-section offers-section-checkout">
                <h2>📦 Bundle & Carousel Offers</h2>
                <div className="offers-container-checkout">
                  {bundleOffers.map((bundleOffer, index) => (
                    <div
                      key={bundleOffer.offer._id}
                      className={`offer-card-checkout ${appliedBundleOffer?.offer._id === bundleOffer.offer._id ? 'applied' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' }}
                    >
                      <div className="offer-content-checkout">
                        <div className="offer-code-checkout">{bundleOffer.offer.code}</div>
                        <div className="offer-discount-checkout">
                          <span>
                            {bundleOffer.offer.carouselDisplayText || bundleOffer.offer.bundleDisplayText || 
                             `${bundleOffer.bundleQuantity || bundleOffer.offer.bundleQuantity || 'X'} products at ₹${bundleOffer.bundlePrice}`}
                          </span>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            Save ₹{(bundleOffer.originalTotal - bundleOffer.bundlePrice).toFixed(2)} on {bundleOffer.matchingProducts.length} product(s)
                          </div>
                        </div>
                        {bundleOffer.offer.description && (
                          <div className="offer-description-checkout">{bundleOffer.offer.description}</div>
                        )}
                        <button
                          className={`offer-apply-btn-checkout ${appliedBundleOffer?.offer._id === bundleOffer.offer._id ? 'applied' : ''}`}
                          onClick={() => {
                            if (appliedBundleOffer?.offer._id === bundleOffer.offer._id) {
                              setAppliedBundleOffer(null);
                              toast.info('Bundle offer removed');
                            } else {
                              setAppliedBundleOffer(bundleOffer);
                              toast.success(`Bundle offer applied! Save ₹${(bundleOffer.originalTotal - bundleOffer.bundlePrice).toFixed(2)}`);
                            }
                          }}
                        >
                          {appliedBundleOffer?.offer._id === bundleOffer.offer._id ? 'Remove' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon Offers Section */}
            {visibleOffers.length > 0 && (
              <div className="form-section offers-section-checkout">
                <h2>🎉 Special Offers</h2>
                <div className="offers-container-checkout">
                  {visibleOffers.map((offer, index) => (
                    <div
                      key={offer._id}
                      className="offer-card-checkout"
                      style={{ background: getOfferColor(index) }}
                    >
                      <div className="offer-content-checkout">
                        <div className="offer-code-checkout">{offer.code}</div>
                        <div className="offer-discount-checkout">
                          <span>
                            {offer.couponDisplayText || 
                             (offer.discountType === 'percentage' 
                               ? `${offer.discount}% OFF` 
                               : `₹${offer.discount} OFF`)}
                          </span>
                        </div>
                        {offer.description && (
                          <div className="offer-description-checkout">{offer.description}</div>
                        )}
                        <button
                          className={`offer-apply-btn-checkout ${appliedCoupon?.code === offer.code ? 'applied' : ''}`}
                          onClick={() => handleApplyOffer(offer)}
                        >
                          {appliedCoupon?.code === offer.code ? 'Remove' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-section">
              <h2>Payment Method</h2>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Credit/Debit Card</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>UPI</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cash on Delivery (COD)</span>
                  {paymentMethod === 'cod' && codCharges > 0 && (
                    <span className="cod-charge-badge">+ ₹{codCharges.toFixed(2)} extra charges</span>
                  )}
                </label>
              </div>
            </div>

            <div className="return-policy-notice">
              <p>
                <strong>Important:</strong> We do not accept any order returns. All sales are final. 
                Please review your order carefully before placing it. 
                <a href="/return-policy" target="_blank" rel="noopener noreferrer"> View Return Policy</a>
              </p>
            </div>

            <button
              type="submit"
              className="place-order-btn"
              disabled={processing}
            >
              {processing ? 'Processing...' : `Place Order - ₹${calculateCartTotal().toFixed(2)}`}
            </button>
          </form>

          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cart?.items.map((item) => (
                <div key={item._id} className="summary-item">
                  <div className="summary-item-image">
                    {(() => {
                      // Use selectedImage if available (color-specific), otherwise fall back to first product image
                      const imageToShow = item.selectedImage || (item.product?.images?.[0]);
                      return imageToShow ? (
                        <img 
                          src={getOptimizedImageUrl(imageToShow, 300)} 
                          alt={item.product?.name || 'Product'}
                          loading="lazy"
                          decoding="async"
                          width="300"
                          height="300"
                          style={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            backgroundColor: "#f2f2f2"
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="placeholder-image">No Image</div>
                      );
                    })()}
                  </div>
                  <div className="summary-item-details">
                    <h4>{item.product?.name}</h4>
                    <div className="summary-item-quantity-controls">
                      <p>Price: ₹{item.price}</p>
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <FiMinus />
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </div>
                    {item.size && <p>Size: {item.size}</p>}
                    {item.color && (
                      <p className="summary-item-color">
                        Color: {item.color}
                        <span 
                          className="summary-color-swatch"
                          style={{ 
                            backgroundColor: getColorValue(item.color),
                            borderColor: '#ddd'
                          }}
                          title={item.color}
                        ></span>
                      </p>
                    )}
                  </div>
                  <span className="summary-item-price">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            
            {/* Order Summary Calculations */}
            {(() => {
              if (!cart) return null;
              
              // Calculate bundle price and original price products separately
              let bundlePriceDisplay = 0;
              let originalPriceProductsTotal = 0;
              let nonMatchingProductsTotal = 0;
              
              if (appliedBundleOffer && cart.items) {
                const bundlePriceToApply = appliedBundleOffer.totalBundlePrice || appliedBundleOffer.bundlePrice;
                bundlePriceDisplay = bundlePriceToApply || 0;
                
                // Get matching product IDs
                const matchingProductIds = (appliedBundleOffer.matchingProducts || []).map(m => m.productId?.toString());
                
                // Calculate original price products total (products not in bundle but matching the offer)
                const originalPriceProducts = appliedBundleOffer.originalPriceProducts || [];
                originalPriceProductsTotal = originalPriceProducts.reduce((sum, origProduct) => {
                  return sum + (origProduct.price * origProduct.quantity);
                }, 0);
                
                // Calculate non-matching products total (products not in the offer at all)
                nonMatchingProductsTotal = cart.items.reduce((sum, item) => {
                  const itemProductId = item.product?._id?.toString() || item.product?.toString();
                  if (!matchingProductIds.includes(itemProductId)) {
                    return sum + (item.price * item.quantity);
                  }
                  return sum;
                }, 0);
              } else {
                // No bundle offer, show subtotal
                nonMatchingProductsTotal = cart.total || 0;
              }
              
              // Calculate coupon discount for display
              const subtotalAfterBundle = calculateSubtotal();
              let couponDiscountDisplay = 0;
              if (appliedCoupon) {
                if (appliedCoupon.discountType === 'percentage') {
                  couponDiscountDisplay = (subtotalAfterBundle * appliedCoupon.discount) / 100;
                } else {
                  couponDiscountDisplay = appliedCoupon.discount;
                }
              }
              
              return (
                <>
                  {appliedBundleOffer && bundlePriceDisplay > 0 && (
                    <div className="summary-bundle-price">
                      <span>
                        Bundle Offer ({appliedBundleOffer.offer.code}): 
                        <span style={{ fontSize: '12px', display: 'block', color: '#666' }}>
                          {(() => {
                            const bundleQty = (appliedBundleOffer.bundleProducts || []).reduce((sum, p) => sum + p.quantity, 0);
                            const originalQty = (appliedBundleOffer.originalPriceProducts || []).reduce((sum, p) => sum + p.quantity, 0);
                            const numberOfBundles = appliedBundleOffer.numberOfBundles || 1;
                            if (originalQty > 0) {
                              return `${numberOfBundles} bundle(s) - ${bundleQty} product(s) at bundle price`;
                            }
                            return `${numberOfBundles} bundle(s) - ${bundleQty} product(s) at bundle price`;
                          })()}
                        </span>
                      </span>
                      <span>₹{bundlePriceDisplay.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {appliedBundleOffer && originalPriceProductsTotal > 0 && (
                    <div className="summary-original-price-products">
                      <span>
                        Products at Original Price: 
                        <span style={{ fontSize: '12px', display: 'block', color: '#666' }}>
                          {(() => {
                            const originalQty = (appliedBundleOffer.originalPriceProducts || []).reduce((sum, p) => sum + p.quantity, 0);
                            return `${originalQty} product(s) at original price`;
                          })()}
                        </span>
                      </span>
                      <span>₹{originalPriceProductsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {appliedBundleOffer && nonMatchingProductsTotal > 0 && (
                    <div className="summary-non-matching-products">
                      <span>
                        Other Products: 
                        <span style={{ fontSize: '12px', display: 'block', color: '#666' }}>
                          Products not in offer
                        </span>
                      </span>
                      <span>₹{nonMatchingProductsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {!appliedBundleOffer && (
                    <div className="summary-subtotal">
                      <span>Subtotal:</span>
                      <span>₹{(cart.total || 0).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {appliedCoupon && couponDiscountDisplay > 0 && (
                    <div className="summary-coupon-discount">
                      <span>
                        Discount ({appliedCoupon.code}): 
                        {appliedCoupon.discountType === 'percentage' 
                          ? ` -${appliedCoupon.discount}%` 
                          : ` -₹${appliedCoupon.discount}`}
                      </span>
                      <span>-₹{couponDiscountDisplay.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {paymentMethod === 'cod' && codCharges > 0 && (
                    <div className="summary-cod-charges">
                      <span>COD Charges:</span>
                      <span>₹{codCharges.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="summary-place-order-price">
                    <span>Order Total:</span>
                    <span>₹{(() => {
                      // Use the same calculation as Place Order button
                      const finalTotal = calculateCartTotal();
                      
                      // Debug: Verify the calculation
                      console.log('=== Order Summary Total ===');
                      console.log('Bundle Price Display:', bundlePriceDisplay);
                      console.log('Original Price Products:', originalPriceProductsTotal);
                      console.log('Non-Matching Products:', nonMatchingProductsTotal);
                      console.log('Subtotal (from calculateSubtotal):', calculateSubtotal());
                      console.log('Final Total (from calculateCartTotal):', finalTotal);
                      console.log('===========================');
                      
                      return finalTotal.toFixed(2);
                    })()}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


