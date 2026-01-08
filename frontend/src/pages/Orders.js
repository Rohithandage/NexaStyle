import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { getOptimizedImageUrl } from '../utils/config';
import { formatPrice, getUserCurrency, getCurrencyForCountry, getSizePriceForCountry, getProductPriceForCountry } from '../utils/currency';
import './Orders.css';

// Color name to hex mapping (same as ProductDetail, Cart, and Checkout)
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

const Orders = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  // Helper function to get currency for an order based on shipping address country
  const getOrderCurrency = (order) => {
    if (order.shippingAddress?.country) {
      return getCurrencyForCountry(order.shippingAddress.country);
    }
    return getUserCurrency();
  };

  // Helper function to recalculate item price based on order's country currency
  const getOrderItemPrice = (item, order) => {
    const product = item.product;
    if (!product) {
      // Fallback to stored price if product is not available
      return item.price || 0;
    }

    // Get country from order's shipping address and format it for the currency functions
    const orderCountryName = order.shippingAddress?.country;
    const orderCountry = orderCountryName ? { country: orderCountryName } : null;
    
    // Temporarily set the selected currency to match the order's country currency
    // This ensures we get the correct pricing for that country
    const originalCurrency = localStorage.getItem('selectedCurrency');
    const orderCurrency = getOrderCurrency(order);
    localStorage.setItem('selectedCurrency', orderCurrency);
    
    let price = 0;
    
    try {
      // Recalculate price based on country-specific pricing
      if (item.size) {
        // Get size-specific pricing for the order's country
        const sizePricing = getSizePriceForCountry(product, item.size, orderCountry);
        // Return price in the order's currency
        price = sizePricing.discountPrice || sizePricing.price || item.price || 0;
      } else {
        // Get product-level pricing for the order's country
        const countryPricing = getProductPriceForCountry(product, orderCountry);
        // Return price in the order's currency
        price = countryPricing.discountPrice || countryPricing.price || item.price || 0;
      }
    } finally {
      // Restore original currency selection
      if (originalCurrency) {
        localStorage.setItem('selectedCurrency', originalCurrency);
      } else {
        localStorage.removeItem('selectedCurrency');
      }
    }
    
    return price;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Check if returning from PayPal payment
    // PayPal redirects with 'token' parameter, but we also check for 'paypal_order_id'
    const paypalOrderId = searchParams.get('paypal_order_id') || searchParams.get('token');
    if (paypalOrderId) {
      verifyPayPalPayment(paypalOrderId);
    } else {
      fetchOrders();
    }
  }, [isAuthenticated, searchParams]);
  
  const verifyPayPalPayment = async (paypalOrderId) => {
    try {
      // Find order with this PayPal order ID
      const res = await api.get('/api/orders/my-orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const order = res.data.find(o => o.paypalOrderId === paypalOrderId);
      if (!order) {
        toast.info('Order not found. Please check your orders.');
        window.history.replaceState({}, '', '/orders');
        fetchOrders();
        return;
      }

      // Check if payment is already completed
      if (order.paymentStatus === 'completed') {
        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
        toast.success('Payment successful! Your order has been confirmed.');
        window.history.replaceState({}, '', '/orders');
        fetchOrders();
        return;
      }

      // Try to capture PayPal payment
      let paymentCompleted = false;
      try {
        const captureRes = await api.post(`/api/orders/capture-paypal/${order._id}`, {
          paypalOrderId: paypalOrderId
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (captureRes.data.success && captureRes.data.paymentStatus === 'completed') {
          paymentCompleted = true;
        }
      } catch (captureError) {
        console.error('Capture error:', captureError);
        // If capture fails, try verification
        try {
          const verifyRes = await api.get(`/api/orders/verify-paypal/${order._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (verifyRes.data.paymentStatus === 'completed') {
            paymentCompleted = true;
          }
        } catch (verifyError) {
          console.error('Verification error:', verifyError);
        }
      }

      // Show success message only once
      if (paymentCompleted) {
        // Dispatch event to update cart count in Navbar
        window.dispatchEvent(new Event('cartUpdated'));
        toast.success('Payment successful! Your order has been confirmed.');
      } else {
        toast.info('Payment is being processed. Please check your orders.');
      }
      
      // Remove paypal_order_id from URL
      window.history.replaceState({}, '', '/orders');
      fetchOrders();
    } catch (error) {
      console.error('Error verifying PayPal payment:', error);
      toast.error('Error verifying payment. Please check your orders.');
      fetchOrders();
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders/my-orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOrders(res.data);
    } catch (error) {
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      shipped: '#007bff',
      delivered: '#28a745',
      cancelled: '#dc3545'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>My Orders</h1>
        {orders.length === 0 ? (
          <div className="no-orders">
            <p>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div>
                    <h3>Order #{order._id.slice(-8)}</h3>
                    <p className="order-date">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="order-status">
                    <span
                      style={{
                        backgroundColor: getStatusColor(order.orderStatus),
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}
                    >
                      {order.orderStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="order-item-image">
                        {(() => {
                          // Use selectedImage if available (color-specific), otherwise fall back to first product image
                          const imageToShow = item.selectedImage || (item.product?.images?.[0]);
                          return imageToShow ? (
                            <img 
                              src={getOptimizedImageUrl(imageToShow, 300)} 
                              alt={item.name}
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
                      <div className="order-item-info">
                        <h4>{item.name}</h4>
                        <p>
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && ' | '}
                          {item.color && (
                            <span className="order-item-color">
                              Color: {item.color}
                              <span 
                                className="order-color-swatch"
                                style={{ 
                                  backgroundColor: getColorValue(item.color),
                                  borderColor: '#ddd'
                                }}
                                title={item.color}
                              ></span>
                            </span>
                          )}
                        </p>
                        <p>Quantity: {item.quantity || 1} × {formatPrice(getOrderItemPrice(item, order), getOrderCurrency(order))}</p>
                      </div>
                      <div className="order-item-total">
                        {formatPrice(getOrderItemPrice(item, order) * (item.quantity || 1), getOrderCurrency(order))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <div className="order-shipping">
                    <h4>Shipping Address:</h4>
                    <p>{order.shippingAddress?.name}</p>
                    <p>{order.shippingAddress?.address}</p>
                    <p>
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
                      {order.shippingAddress?.pincode}
                    </p>
                    <p>Phone: {order.shippingAddress?.phone}</p>
                  </div>
                  <div className="order-total">
                    <div className="total-row">
                      <span>Payment Method:</span>
                      <span>{order.paymentMethod.toUpperCase()}</span>
                    </div>
                    <div className="total-row">
                      <span>Payment Status:</span>
                      <span
                        style={{
                          color:
                            order.paymentStatus === 'completed' ? '#28a745' : '#ffc107'
                        }}
                      >
                        {order.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="total-row total-amount">
                      <span>Total Amount:</span>
                      <span>{formatPrice(order.totalAmount, getOrderCurrency(order))}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;


