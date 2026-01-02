import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      fetchBundleOffers();
    } else {
      setBundleOffers([]);
      setAppliedBundleOffer(null);
    }
  }, [cart]);

  const fetchCart = async () => {
    try {
      const res = await api.get('/api/cart', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCart(res.data);
      if (!res.data || res.data.items.length === 0) {
        toast.info('Your cart is empty');
        navigate('/cart');
      }
    } catch (error) {
      toast.error('Error loading cart');
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
      setBundleOffers(applicableOffers);
      
      // Auto-apply the first applicable bundle offer if available
      if (applicableOffers.length > 0 && !appliedBundleOffer) {
        setAppliedBundleOffer(applicableOffers[0]);
        toast.success(`Bundle offer applied! Save ₹${(applicableOffers[0].originalTotal - applicableOffers[0].bundlePrice).toFixed(2)}`);
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

  // Calculate cart total with coupon discount and bundle pricing
  const calculateCartTotal = () => {
    let total = cart?.total || 0;
    
    // Apply bundle pricing if applicable
    if (appliedBundleOffer) {
      // Calculate total for bundle products
      const bundleProductsTotal = appliedBundleOffer.matchingProducts.reduce((sum, match) => {
        const cartItem = cart.items.find(item => 
          item.product._id === match.productId || item.product._id.toString() === match.productId
        );
        return sum + (cartItem ? cartItem.price * cartItem.quantity : 0);
      }, 0);
      
      // Replace bundle products total with bundle price
      total = total - bundleProductsTotal + appliedBundleOffer.bundlePrice;
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
    
    return total;
  };

  const handleInputChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
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
              const bundleProductsTotal = appliedBundleOffer.matchingProducts.reduce((sum, match) => {
                const cartItem = cart.items.find(item => 
                  item.product._id === match.productId || item.product._id.toString() === match.productId
                );
                return sum + (cartItem ? cartItem.price * cartItem.quantity : 0);
              }, 0);
              total = total - bundleProductsTotal + appliedBundleOffer.bundlePrice;
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

            {/* Bundle Offers Section */}
            {bundleOffers.length > 0 && (
              <div className="form-section offers-section-checkout">
                <h2>📦 Bundle Offers</h2>
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
                            {bundleOffer.offer.bundleDisplayText || 
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
                    <p>Qty: {item.quantity} × ₹{item.price}</p>
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
            <div className="summary-subtotal">
              <span>Subtotal:</span>
              <span>₹{cart?.total || 0}</span>
            </div>
            {appliedBundleOffer && (
              <div className="summary-bundle-discount">
                <span>
                  Bundle Offer ({appliedBundleOffer.offer.code}): 
                  <span style={{ fontSize: '12px', display: 'block', color: '#666' }}>
                    {appliedBundleOffer.matchingProducts.length} product(s) at bundle price
                  </span>
                </span>
                <span>
                  -₹{(() => {
                    const bundleProductsTotal = appliedBundleOffer.matchingProducts.reduce((sum, match) => {
                      const cartItem = cart.items.find(item => 
                        item.product._id === match.productId || item.product._id.toString() === match.productId
                      );
                      return sum + (cartItem ? cartItem.price * cartItem.quantity : 0);
                    }, 0);
                    return (bundleProductsTotal - appliedBundleOffer.bundlePrice).toFixed(2);
                  })()}
                </span>
              </div>
            )}
            {appliedCoupon && (
              <div className="summary-coupon-discount">
                <span>
                  Discount ({appliedCoupon.code}): 
                  {appliedCoupon.discountType === 'percentage' 
                    ? ` -${appliedCoupon.discount}%` 
                    : ` -₹${appliedCoupon.discount}`}
                </span>
                <span>
                  -₹{(() => {
                    let totalForDiscount = cart?.total || 0;
                    // If bundle is applied, calculate discount on bundle-adjusted total
                    if (appliedBundleOffer) {
                      const bundleProductsTotal = appliedBundleOffer.matchingProducts.reduce((sum, match) => {
                        const cartItem = cart.items.find(item => 
                          item.product._id === match.productId || item.product._id.toString() === match.productId
                        );
                        return sum + (cartItem ? cartItem.price * cartItem.quantity : 0);
                      }, 0);
                      totalForDiscount = totalForDiscount - bundleProductsTotal + appliedBundleOffer.bundlePrice;
                    }
                    const discount = appliedCoupon.discountType === 'percentage'
                      ? (totalForDiscount * appliedCoupon.discount) / 100
                      : appliedCoupon.discount;
                    return discount.toFixed(2);
                  })()}
                </span>
              </div>
            )}
            {paymentMethod === 'cod' && codCharges > 0 && (
              <div className="summary-cod-charges">
                <span>COD Charges:</span>
                <span>₹{codCharges.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-total">
              <span>Total:</span>
              <span>₹{calculateCartTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


