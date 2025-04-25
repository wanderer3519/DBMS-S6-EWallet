import React, { useState, useEffect } from 'react';
import { Container, Badge, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './MyOrders.css'; // Import the CSS to maintain styling

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refundMessage, setRefundMessage] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view your orders');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:8000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        setOrders(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.response?.data?.detail || 'Failed to fetch orders');
        setLoading(false);
      }
    };

    fetchOrders();
    
    // Check for refund parameter in URL
    const queryParams = new URLSearchParams(location.search);
    const refundOrderId = queryParams.get('refund');
    
    if (refundOrderId) {
      handleRefund(refundOrderId);
      // Remove the refund parameter from the URL
      navigate('/orders', { replace: true });
    }
  }, [location, navigate]);

  const handleRefund = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:8000/api/orders/${orderId}/refund`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Show success message
      setRefundMessage({
        type: 'success',
        text: `Order #${orderId} has been cancelled and refunded. ₹${response.data.refund_amount} has been credited to your wallet.`
      });
      
      // Refresh the orders list
      const updatedOrders = await axios.get('http://localhost:8000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setOrders(updatedOrders.data);
      
    } catch (err) {
      console.error('Error refunding order:', err);
      setRefundMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to process refund. Please try again.'
      });
    }
  };

  const canBeRefunded = (order) => {
    // Check if order is eligible for refund (not cancelled and within 24 hours)
    if (order.status === 'cancelled') return false;
    
    const orderTime = new Date(order.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - orderTime;
    
    // Return true if order is within 24 hours
    return timeDiff <= 24 * 60 * 60 * 1000;
  };

  if (loading) return <div className="orders-loading">Loading your orders...</div>;
  if (error) return <div className="orders-error">{error}</div>;

  return (
    <div className="my-orders-container">
      <div className="my-orders-header">
        <h1>My Orders</h1>
        <div className="orders-header-actions">
          <button className="back-to-dashboard" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
      
      {refundMessage && (
        <Alert 
          variant={refundMessage.type === 'success' ? 'success' : 'danger'}
          className={`refund-message ${refundMessage.type}`}
          onClose={() => setRefundMessage(null)} 
          dismissible
        >
          {refundMessage.text}
        </Alert>
      )}
      
      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No Orders Found</h2>
          <p>You haven't placed any orders yet.</p>
          <button 
            className="start-shopping-btn" 
            onClick={() => navigate('/dashboard')}
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.order_id} className="order-card">
              <div className="order-header">
                <div className="order-title">
                  <div className="order-id">
                    <span>Order #</span>{order.order_id}
                  </div>
                  <span 
                    className={`status-badge ${order.status.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="order-date">
                  <span className="timestamp-label">Placed on:</span> 
                  {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                </div>
              </div>
              
              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item.order_item_id} className="order-item">
                    <div className="item-details">
                      <h3>{item.name}</h3>
                      <p className="item-quantity">Quantity: {item.quantity}</p>
                      <p className="item-price">Price: ₹{item.price_at_time.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="order-summary">
                <div className="amount-details">
                  <div className="amount-item total">
                    <span className="label">Total Amount:</span>
                    <span className="value">₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="order-actions">
                  {canBeRefunded(order) && (
                    <Button 
                      variant="danger"
                      className="refund-order-btn"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this order and get a refund to your wallet? This action cannot be undone.')) {
                          handleRefund(order.order_id);
                        }
                      }}
                    >
                      Cancel & Get Refund
                    </Button>
                  )}
                  
                  {order.status === 'cancelled' && (
                    <div className="refund-status">
                      <span className="refund-label">Refunded to wallet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;