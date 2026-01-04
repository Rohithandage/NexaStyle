import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../utils/config';
import './Cart.css';
import './Checkout.css';

// Color name to hex mapping (same as ProductDetail)
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

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [bundleOffers, setBundleOffers] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [appliedBundleOffer, setAppliedBundleOffer] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
    fetchOffers();
    
    // Listen for coupon updates from other pages
    const handleCouponUpdate = () => {
      fetchOffers();
    };
    window.addEventListener('couponApplied', handleCouponUpdate);
    window.addEventListener('storage', handleCouponUpdate);
    
    return () => {
      window.removeEventListener('couponApplied', handleCouponUpdate);
      window.removeEventListener('storage', handleCouponUpdate);
    };
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
    } catch (error) {
      toast.error('Error loading cart');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await api.get('/api/settings/offers');
      setOffers(res.data.offers || []);
      
      // Check for applied coupon from localStorage
      const pendingCouponCode = localStorage.getItem('pendingCouponCode');
      if (pendingCouponCode && res.data.offers) {
        const coupon = res.data.offers.find(
          offer => offer.isActive && offer.code.toUpperCase() === pendingCouponCode.toUpperCase()
        );
        if (coupon) {
          setAppliedCoupon(coupon);
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
      
      // Check if currently applied bundle offer is still valid
      if (appliedBundleOffer) {
        const stillValid = applicableOffers.find(
          offer => offer.offer._id === appliedBundleOffer.offer._id
        );
        if (!stillValid) {
          // Offer is no longer valid, clear it
          setAppliedBundleOffer(null);
        } else {
          // Update the applied offer with latest data (important for quantity changes)
          setAppliedBundleOffer(stillValid);
        }
      } else {
        // Auto-apply the first applicable bundle offer if available
        if (applicableOffers.length > 0) {
          setAppliedBundleOffer(applicableOffers[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching bundle offers:', error);
    }
  };

  // Calculate subtotal with bundle pricing
  const calculateSubtotal = () => {
    if (!cart) return 0;
    
    // Start with cart total (all products at original price)
    let subtotal = cart.total || 0;
    
    // Apply bundle pricing if applicable
    if (appliedBundleOffer && cart.items) {
      // Get matching product IDs from the offer
      const matchingProductIds = (appliedBundleOffer.matchingProducts || []).map(m => m.productId?.toString());
      
      // Calculate total for products that get bundle pricing (at original price)
      const bundleProductsTotal = (appliedBundleOffer.bundleProducts || []).reduce((sum, bundleProduct) => {
        return sum + (bundleProduct.price * bundleProduct.quantity);
      }, 0);
      
      // Get total bundle price to apply
      const bundlePriceToApply = appliedBundleOffer.totalBundlePrice || appliedBundleOffer.bundlePrice;
      
      // Recalculate bundleProductsTotal to ensure it's correct
      const requiredQuantity = appliedBundleOffer.bundleQuantity || 1;
      const numberOfBundles = appliedBundleOffer.numberOfBundles || 1;
      
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
      
      const finalBundleProductsTotal = recalculatedBundleProductsTotal > 0 ? recalculatedBundleProductsTotal : bundleProductsTotal;
      
      // Calculate subtotal: cart.total - products that get bundle pricing + bundle price
      subtotal = subtotal - finalBundleProductsTotal + bundlePriceToApply;
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
    
    return total || 0;
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
      await fetchCart();
      // Refresh bundle offers to update breakdown (important when quantity changes affect bundles)
      await fetchBundleOffers();
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast.error('Error updating cart');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/cart/remove/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Item removed from cart');
      fetchCart();
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast.error('Error removing item');
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <button onClick={() => navigate('/products')}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1>Shopping Cart</h1>
        <div className="cart-content">
          <div className="cart-items">
            {cart.items.map((item) => (
              <div key={item._id} className="cart-item">
                <div className="cart-item-image">
                  {(() => {
                    // Use selectedImage if available (color-specific), otherwise fall back to first product image
                    const imageToShow = item.selectedImage || (item.product?.images?.[0]);
                    return imageToShow ? (
                      <img 
                        src={getOptimizedImageUrl(imageToShow, 300)} 
                        alt={item.product?.name}
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
                <div className="cart-item-info">
                  <h3>{item.product?.name}</h3>
                  {item.size && <p>Size: {item.size}</p>}
                  {item.color && (
                    <p className="cart-item-color">
                      Color: {item.color}
                      <span 
                        className="cart-color-swatch"
                        style={{ 
                          backgroundColor: getColorValue(item.color),
                          borderColor: '#ddd'
                        }}
                        title={item.color}
                      ></span>
                    </p>
                  )}
                  <p className="cart-item-price">₹{item.price}</p>
                </div>
                <div className="cart-item-quantity">
                  <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                    <FiMinus />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                    <FiPlus />
                  </button>
                </div>
                <div className="cart-item-total">
                  ₹{item.price * item.quantity}
                </div>
                <button
                  onClick={() => removeItem(item._id)}
                  className="remove-item-btn"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

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
                            const numberOfBundles = appliedBundleOffer.numberOfBundles || 1;
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
                  
                  <div className="summary-shipping">
                    <span>Shipping:</span>
                    <span style={{ color: '#28a745', fontWeight: '700' }}>Free</span>
                  </div>
                  
                  <div className="summary-place-order-price">
                    <span>Order Total:</span>
                    <span>₹{(() => {
                      // Use the same calculation as Place Order button
                      const finalTotal = calculateCartTotal();
                      return finalTotal.toFixed(2);
                    })()}</span>
                  </div>
                  
                  <button
                    onClick={() => navigate('/checkout')}
                    className="checkout-btn"
                    style={{ marginTop: '1rem', width: '100%' }}
                  >
                    Proceed to Checkout
                  </button>
                </>
              );
            })()}
          </div>
          {/* <div className="cart-summary">
            <h2>Order Summary</h2>
            
            {/* Applied Offers Section */}
            {/* {(appliedCoupon || appliedBundleOffer) && (
              <div className="cart-applied-offers" style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#0369a1' }}>Applied Offers</h3>
                
                {appliedBundleOffer && (
                  <div style={{ 
                    marginBottom: '0.5rem', 
                    padding: '0.75rem', 
                    backgroundColor: 'white', 
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#059669' }}>
                        📦 {appliedBundleOffer.offer.bundleDisplayText || 
                             `${appliedBundleOffer.bundleQuantity || appliedBundleOffer.offer.bundleQuantity || 'X'} products at ₹${appliedBundleOffer.bundlePrice}`}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                        Code: {appliedBundleOffer.offer.code}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAppliedBundleOffer(null);
                        toast.info('Bundle offer removed');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0.25rem 0.5rem'
                      }}
                      title="Remove bundle offer"
                    >
                      ×
                    </button>
                  </div>
                )}
                
                {appliedCoupon && (
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: 'white', 
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#059669' }}>
                        🎟️ {appliedCoupon.code} - {appliedCoupon.couponDisplayText || 
                          (appliedCoupon.discountType === 'percentage' 
                            ? `${appliedCoupon.discount}% OFF` 
                            : `₹${appliedCoupon.discount} OFF`)}
                      </div>
                      {appliedCoupon.description && (
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                          {appliedCoupon.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        localStorage.removeItem('pendingCouponCode');
                        window.dispatchEvent(new Event('couponApplied'));
                        toast.info('Coupon removed');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0.25rem 0.5rem'
                      }}
                      title="Remove coupon"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{cart.total}</span>
            </div>
            
            {appliedBundleOffer && (
              <div className="summary-row" style={{ color: '#059669', fontSize: '0.9rem' }}>
                <span>
                  Bundle Offer ({appliedBundleOffer.offer.code}): 
                  <span style={{ fontSize: '0.85rem', display: 'block', color: '#666', marginTop: '0.25rem' }}>
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
              <div className="summary-row" style={{ color: '#059669', fontSize: '0.9rem' }}>
                <span>
                  Discount ({appliedCoupon.code}): 
                  {appliedCoupon.discountType === 'percentage' 
                    ? ` -${appliedCoupon.discount}%` 
                    : ` -₹${appliedCoupon.discount}`}
                </span>
                <span>
                  -₹{(() => {
                    let totalForDiscount = cart?.total || 0;
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
            
            <div className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{calculateCartTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="checkout-btn"
            >
              Proceed to Checkout
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Cart;


