import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
        fetchUserOrders();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }

            const { access_token } = JSON.parse(userData);
            if (!access_token) {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/api/account/profile', {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            });
            setUser(response.data);
        } catch (err) {
            console.error('Error fetching user profile:', err);
            setError('Failed to load user profile');
        }
    };

    const fetchUserOrders = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }

            const { access_token } = JSON.parse(userData);
            if (!access_token) {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/api/orders', {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            });
            setOrders(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to load order history');
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return <div className="profile-loading">Loading profile...</div>;
    }

    if (error) {
        return <div className="profile-error">{error}</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>My Profile</h1>
                <button 
                    className="back-to-dashboard"
                    onClick={() => navigate('/dashboard')}
                >
                    ← Back to Dashboard
                </button>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <h2>Personal Information</h2>
                    <div className="profile-info">
                        <div className="info-group">
                            <label>Full Name</label>
                            <p>{user?.full_name}</p>
                        </div>
                        <div className="info-group">
                            <label>Email</label>
                            <p>{user?.email}</p>
                        </div>
                        <div className="info-group">
                            <label>Phone</label>
                            <p>{user?.phone || 'Not provided'}</p>
                        </div>
                        <div className="info-group">
                            <label>Address</label>
                            <p>{user?.address || 'Not provided'}</p>
                        </div>
                        <div className="info-group">
                            <label>Account Created</label>
                            <p>{formatDate(user?.created_at)}</p>
                        </div>
                        <div className="info-group">
                            <label>Account Balance</label>
                            <p>₹{user?.accounts?.[0]?.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                </div>

                <div className="profile-section">
                    <h2>Order History</h2>
                    <div className="order-stats">
                        <div className="stat-card">
                            <span className="stat-value">{orders.length}</span>
                            <span className="stat-label">Total Orders</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">
                                ₹{orders.reduce((total, order) => total + order.total_amount, 0).toFixed(2)}
                            </span>
                            <span className="stat-label">Total Spent</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">
                                {orders.filter(order => order.status === 'completed').length}
                            </span>
                            <span className="stat-label">Completed Orders</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">
                                {orders.filter(order => order.status === 'pending').length}
                            </span>
                            <span className="stat-label">Pending Orders</span>
                        </div>
                    </div>

                    <div className="orders-list">
                        {orders.length === 0 ? (
                            <div className="no-orders">
                                <p>No orders found</p>
                                <button 
                                    className="start-shopping"
                                    onClick={() => navigate('/products')}
                                >
                                    Start Shopping
                                </button>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.order_id} className="order-card">
                                    <div className="order-header">
                                        <div className="order-info">
                                            <h3>Order #{order.order_id}</h3>
                                            <p className="order-date">
                                                {formatDate(order.created_at)}
                                            </p>
                                        </div>
                                        <div className="order-status">
                                            <span className={`status-badge ${order.status.toLowerCase()}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="order-items">
                                        {order.items.map((item, index) => (
                                            <div key={index} className="order-item">
                                                <span className="item-name">{item.name}</span>
                                                <span className="item-quantity">x{item.quantity}</span>
                                                <span className="item-price">₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="order-footer">
                                        <div className="order-total">
                                            <span>Total Amount:</span>
                                            <span className="total-amount">₹{order.total_amount}</span>
                                        </div>
                                        <button 
                                            className="view-details"
                                            onClick={() => navigate(`/order-confirmation/${order.order_id}`)}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile; 