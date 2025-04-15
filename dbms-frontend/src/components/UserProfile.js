import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSpent: 0,
        completedOrders: 0,
        pendingOrders: 0
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
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
            setEditForm({
                full_name: response.data.full_name,
                email: response.data.email,
                phone: response.data.phone || ''
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching user profile:', err);
            setError('Failed to load user profile');
            setLoading(false);
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
            
            // Calculate stats
            const completedOrders = response.data.filter(order => order.status === 'completed');
            const pendingOrders = response.data.filter(order => order.status === 'pending');
            const totalSpent = response.data.reduce((sum, order) => sum + order.total_amount, 0);

            setStats({
                totalOrders: response.data.length,
                totalSpent: totalSpent,
                completedOrders: completedOrders.length,
                pendingOrders: pendingOrders.length
            });
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to load order history');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }

            const { access_token } = JSON.parse(userData);
            const response = await axios.put(
                'http://localhost:8000/api/account/profile',
                editForm,
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setUser(response.data);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile. ' + (err.response?.data?.detail || err.message));
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

            {successMessage && (
                <div className="success-message">{successMessage}</div>
            )}

            <div className="profile-content">
                <div className="profile-section">
                    <div className="section-header">
                        <h2>Personal Information</h2>
                        {!isEditing && (
                            <button 
                                className="edit-button"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleUpdateProfile} className="edit-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        full_name: e.target.value
                                    })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        email: e.target.value
                                    })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        phone: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-button">
                                    Save Changes
                                </button>
                                <button 
                                    type="button" 
                                    className="cancel-button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditForm({
                                            full_name: user.full_name,
                                            email: user.email,
                                            phone: user.phone || ''
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-details">
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Full Name</label>
                                    <p>{user.full_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Email</label>
                                    <p>{user.email}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Phone</label>
                                    <p>{user.phone || 'Not provided'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Member Since</label>
                                    <p>{formatDate(user.created_at)}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Account Balance</label>
                                    <p>₹{user.accounts?.[0]?.balance?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-section">
                    <h2>Order History</h2>
                    <div className="order-stats">
                        <div className="stat-card">
                            <span className="stat-value">{stats.totalOrders}</span>
                            <span className="stat-label">Total Orders</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">₹{stats.totalSpent.toFixed(2)}</span>
                            <span className="stat-label">Total Spent</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.completedOrders}</span>
                            <span className="stat-label">Completed Orders</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{stats.pendingOrders}</span>
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