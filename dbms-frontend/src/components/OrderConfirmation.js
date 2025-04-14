import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(`http://localhost:8000/api/orders/${orderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setOrder(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError('Failed to load order details. Please try again.');
            setLoading(false);
        }
    };

    if (loading) return <div className="order-confirmation-loading">Loading order details...</div>;
    if (error) return <div className="order-confirmation-error">{error}</div>;
    if (!order) return <div className="order-confirmation-error">Order not found</div>;

    return (
        <div className="order-confirmation-container">
            <div className="order-confirmation-content">
                <div className="success-icon">✓</div>
                <h1>Order Confirmed!</h1>
                <p className="order-id">Order ID: #{order.order_id}</p>
                <div className="order-details">
                    <h2>Order Details</h2>
                    <div className="order-summary">
                        <p>Total Amount: ₹{order.total_amount.toFixed(2)}</p>
                        <p>Status: {order.status}</p>
                        <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="order-items">
                        <h3>Items Ordered</h3>
                        {order.items.map((item, index) => (
                            <div key={index} className="order-item">
                                <p>Product ID: {item.product_id}</p>
                                <p>Quantity: {item.quantity}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="order-actions">
                    <button 
                        className="continue-shopping"
                        onClick={() => navigate('/dashboard')}
                    >
                        Continue Shopping
                    </button>
                    <button 
                        className="view-orders"
                        onClick={() => navigate('/orders')}
                    >
                        View All Orders
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation; 