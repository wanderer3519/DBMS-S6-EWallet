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
        pendingOrders: 0,
        rewardPoints: 0,
        rewardValue: 0
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [walletHistory, setWalletHistory] = useState([]);
    const [showWalletHistory, setShowWalletHistory] = useState(false);
    const navigate = useNavigate();

    // Set up axios auth header when component mounts
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        
        // Configure axios with the token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Load data
        fetchUserProfile();
        fetchUserOrders();
        fetchRewardPoints();
        
        // Cleanup function to reset axios header when component unmounts
        return () => {
            // Reset the header to avoid leaking token to other components
            delete axios.defaults.headers.common['Authorization'];
        };
    }, [navigate]);

    const fetchUserProfile = async () => {
        try {
            console.log('Fetching user profile...');
            const response = await axios.get('http://localhost:8000/api/account/profile');
            console.log('Profile response:', response.data);
            
            setUser(response.data);
            setEditForm({
                full_name: response.data.full_name,
                email: response.data.email,
                phone: response.data.phone || ''
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching user profile:', err);
            console.error('Error details:', err.response?.data || err.message);
            setError('Failed to load user profile');
            setLoading(false);
            
            // If we get a 401 response, the token is invalid or expired
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const fetchUserOrders = async () => {
        try {
            console.log('Fetching user orders...');
            const response = await axios.get('http://localhost:8000/api/orders');
            console.log('Orders response:', response.data);

            setOrders(response.data);
            
            // Calculate stats
            const completedOrders = response.data.filter(order => order.status === 'completed');
            const pendingOrders = response.data.filter(order => order.status === 'pending');
            const totalSpent = response.data.reduce((sum, order) => sum + order.total_amount, 0);

            setStats(prevStats => ({
                ...prevStats,
                totalOrders: response.data.length,
                totalSpent: totalSpent,
                completedOrders: completedOrders.length,
                pendingOrders: pendingOrders.length
            }));
        } catch (err) {
            console.error('Error fetching orders:', err);
            console.error('Error details:', err.response?.data || err.message);
            setError('Failed to load order history');
            
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const fetchRewardPoints = async () => {
        try {
            console.log('Fetching reward points...');
            const response = await axios.get('http://localhost:8000/api/account/rewards');
            console.log('Rewards response:', response.data);
            
            setStats(prevStats => ({
                ...prevStats,
                rewardPoints: response.data.total_points,
                rewardValue: response.data.points_value
            }));

            // If we have rewards history, set it for potential display
            if (response.data.rewards && response.data.rewards.length > 0) {
                setWalletHistory(response.data.rewards);
            }
        } catch (error) {
            console.error('Error fetching reward points:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const fetchWalletHistory = async () => {
        try {
            // Here we'd use a proper wallet history endpoint if available
            // For now, we'll use the rewards data we already have
            setShowWalletHistory(true);
        } catch (error) {
            console.error('Error fetching wallet history:', error);
            setError('Failed to load wallet history');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            console.log('Updating profile...');
            const response = await axios.put(
                'http://localhost:8000/api/account/profile',
                editForm,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('Update response:', response.data);

            setUser(response.data);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            console.error('Error details:', err.response?.data || err.message);
            setError('Failed to update profile. ' + (err.response?.data?.detail || err.message));
            
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
        return <div className="loading">Loading user profile...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!user) {
        return <div className="error">No user data found</div>;
    }

    return (
        <div className="user-profile-container">
            {loading ? (
                <div className="loading">Loading user profile...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <>
                    {successMessage && <div className="success-message">{successMessage}</div>}
                    
                    {isEditing ? (
                        // Edit Profile Form
                        <div className="edit-profile-form">
                            <h2>Edit Profile</h2>
                            <form onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="address">Address</label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="save-btn">Save Changes</button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    ) : showWalletHistory ? (
                        // Wallet History Section
                        <div className="history-section">
                            <div className="history-header">
                                <h2>Wallet & Rewards History</h2>
                                <button className="close-history-btn" onClick={() => setShowWalletHistory(false)}>×</button>
                            </div>
                            <div className="history-list">
                                {walletHistory && walletHistory.length > 0 ? (
                                    walletHistory.map((item, index) => (
                                        <div key={index} className="history-item">
                                            <div className="history-header">
                                                <span className="history-type">{item.type}</span>
                                                <span className="history-timestamp">{formatDate(item.timestamp)}</span>
                                            </div>
                                            <div className="history-details">
                                                <p><strong>Amount:</strong> {formatCurrency(item.amount)}</p>
                                                {item.description && <p><strong>Details:</strong> {item.description}</p>}
                                                {item.balance && <p><strong>Balance After:</strong> {formatCurrency(item.balance)}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-history">No wallet or reward history available.</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Main Profile View
                        <>
                            <div className="profile-header">
                                <div className="header-content">
                                    <h1>{user.full_name}</h1>
                                    <p className="user-email">{user.email}</p>
                                </div>
                                <div className="header-actions">
                                    <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                                    <button className="history-btn" onClick={() => setShowWalletHistory(true)}>View Wallet History</button>
                                    <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Wallet Balance</h3>
                                    <p className="stat-value">{formatCurrency(user.accounts?.[0]?.balance || 0)}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Reward Points</h3>
                                    <p className="stat-value">{stats.rewardPoints || 0}</p>
                                    <p className="stat-subtext">Worth {formatCurrency((stats.rewardPoints || 0) * 0.1)}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Orders</h3>
                                    <p className="stat-value">{stats.totalOrders || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Spent</h3>
                                    <p className="stat-value">{formatCurrency(stats.totalSpent || 0)}</p>
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="profile-details">
                                <div className="details-section">
                                    <h2>Personal Information</h2>
                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <label>Full Name</label>
                                            <p>{user.full_name}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Email Address</label>
                                            <p>{user.email}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Phone Number</label>
                                            <p>{user.phone || 'Not provided'}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Address</label>
                                            <p>{user.address || 'Not provided'}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Member Since</label>
                                            <p>{formatDate(user.created_at)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Orders Section */}
                                <div className="recent-orders-section">
                                    <div className="section-header">
                                        <h2>Recent Orders</h2>
                                        <button className="view-all-btn" onClick={() => navigate('/orders')}>View All Orders</button>
                                    </div>
                                    <div className="recent-orders-list">
                                        {orders && orders.length > 0 ? (
                                            orders.slice(0, 3).map(order => (
                                                <div key={order.id} className="order-card">
                                                    <div className="order-header">
                                                        <div className="order-info">
                                                            <h3>Order #{order.id}</h3>
                                                            <p className="order-date">{formatDate(order.date)}</p>
                                                        </div>
                                                        <span className={`status-badge ${order.status.toLowerCase()}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="order-footer">
                                                        <div className="order-total">
                                                            Total: <span className="total-amount">{formatCurrency(order.total_amount)}</span>
                                                        </div>
                                                        <button className="view-details" onClick={() => navigate(`/orders/${order.id}`)}>
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-orders">
                                                <p>You haven't placed any orders yet.</p>
                                                <button className="start-shopping" onClick={() => navigate('/products')}>
                                                    Start Shopping
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default UserProfile; 