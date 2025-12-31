import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { getImageUrl } from '../utils/config';
import './Checkout.css';

const Checkout = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    streetAddress: '',
    phone: '',
    state: '',
    townCity: '',
    postcode: ''
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
    
    // Ensure Razorpay script is loaded - use synchronous loading for mobile compatibility
    if (!window.Razorpay) {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="razorpay.com"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = false; // Load synchronously for better mobile compatibility
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
          console.error('Failed to load Razorpay script');
          toast.error('Payment gateway failed to load. Please refresh the page.');
        };
        script.onload = () => {
          console.log('Razorpay script loaded successfully');
        };
        document.head.appendChild(script);
      }
    }
  }, [isAuthenticated]);

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

  const handleInputChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
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
          paymentMethod
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (paymentMethod === 'card' || paymentMethod === 'upi') {
        // Wait for Razorpay to be loaded (in case it was dynamically loaded)
        let retries = 0;
        const maxRetries = 20; // Increased retries for mobile
        const checkRazorpay = () => {
          if (window.Razorpay && typeof window.Razorpay === 'function') {
            initializeRazorpay();
          } else if (retries < maxRetries) {
            retries++;
            setTimeout(checkRazorpay, 300); // Increased delay for mobile
          } else {
            toast.error('Payment gateway not loaded. Please refresh the page and try again.');
            setProcessing(false);
          }
        };
        
        const initializeRazorpay = () => {
          // Detect mobile device
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          // Additional check to ensure Razorpay is fully initialized
          if (!window.Razorpay || typeof window.Razorpay !== 'function') {
            toast.error('Payment gateway not ready. Please wait a moment and try again.');
            setProcessing(false);
            return;
          }
          
          // Small delay on mobile to ensure all assets are loaded
          const openModal = () => {
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

          try {
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
            
            // Open Razorpay modal with error handling
            try {
              // Add small delay on mobile to ensure assets are loaded
              if (isMobile) {
                setTimeout(() => {
                  try {
                    razorpay.open();
                  } catch (openError) {
                    console.error('Error opening Razorpay modal:', openError);
                    toast.error('Failed to open payment gateway. Please try again.');
                    setProcessing(false);
                  }
                }, 100);
              } else {
                razorpay.open();
              }
            } catch (openError) {
              console.error('Error opening Razorpay modal:', openError);
              toast.error('Failed to open payment gateway. Please try again.');
              setProcessing(false);
            }
          } catch (error) {
            console.error('Razorpay initialization error:', error);
            toast.error('Failed to initialize payment gateway. Please refresh the page and try again.');
            setProcessing(false);
          }
          };
          
          // Execute with delay on mobile
          if (isMobile) {
            setTimeout(openModal, 200);
          } else {
            openModal();
          }
        };
        
        checkRazorpay();
      } else {
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      toast.error('Error placing order');
    } finally {
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
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Postcode / ZIP *</label>
                <input
                  type="text"
                  name="postcode"
                  value={shippingAddress.postcode}
                  onChange={handleInputChange}
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
                  required
                />
              </div>
            </div>

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
              {processing ? 'Processing...' : `Place Order - ₹${cart?.total || 0}`}
            </button>
          </form>

          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cart?.items.map((item) => (
                <div key={item._id} className="summary-item">
                  <div className="summary-item-image">
                    {item.product?.images?.[0] ? (
                      <img 
                        src={getImageUrl(item.product.images[0])} 
                        alt={item.product?.name || 'Product'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="placeholder-image">No Image</div>
                    )}
                  </div>
                  <div className="summary-item-details">
                    <h4>{item.product?.name}</h4>
                    <p>Qty: {item.quantity} × ₹{item.price}</p>
                    {item.size && <p>Size: {item.size}</p>}
                    {item.color && <p>Color: {item.color}</p>}
                  </div>
                  <span className="summary-item-price">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span>Total:</span>
              <span>₹{cart?.total || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


