import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { getImageUrl } from '../utils/config';
import './Orders.css';

const Orders = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();
  }, [isAuthenticated]);

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
                        {item.product?.images?.[0] ? (
                          <img src={getImageUrl(item.product.images[0])} alt={item.product.name} />
                        ) : (
                          <div className="placeholder-image">No Image</div>
                        )}
                      </div>
                      <div className="order-item-info">
                        <h4>{item.name}</h4>
                        <p>Size: {item.size} | Color: {item.color}</p>
                        <p>Quantity: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <div className="order-item-total">
                        ₹{item.price * item.quantity}
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
                      <span>₹{order.totalAmount}</span>
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


