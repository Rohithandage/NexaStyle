import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import './Cart.css';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      const res = await axios.get('/api/cart', {
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

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await axios.put(
        `/api/cart/update/${itemId}`,
        { quantity: newQuantity },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      fetchCart();
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast.error('Error updating cart');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/cart/remove/${itemId}`, {
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
                  {item.product?.images?.[0] ? (
                    <img 
                      src={item.product.images[0].startsWith('http') ? item.product.images[0] : `http://localhost:5000${item.product.images[0]}`} 
                      alt={item.product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="placeholder-image">No Image</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h3>{item.product?.name}</h3>
                  <p>Size: {item.size}</p>
                  <p>Color: {item.color}</p>
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

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{cart.total}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{cart.total}</span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="checkout-btn"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;


