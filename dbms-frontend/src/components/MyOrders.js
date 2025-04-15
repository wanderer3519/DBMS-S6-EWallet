import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyOrders.css';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOption, setSortOption] = useState('newest');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/api/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Initially sort orders by date (newest first)
            const sortedOrders = response.data.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
            
            // Find all unique payment methods
            const methods = [...new Set(sortedOrders.map(order => order.payment_method || 'Wallet'))];
            setPaymentMethods(methods);
            
            // Transform orders data to change 'pending' status to 'Ordered'
            const transformedOrders = sortedOrders.map(order => ({
                ...order,
                display_status: order.status.toLowerCase() === 'pending' ? 'Ordered' : order.status
            }));
            
            setOrders(transformedOrders);
            setFilteredOrders(transformedOrders);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err.response?.data?.detail || 'Failed to load orders');
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Apply filters and sorting whenever orders, sortOption, or paymentFilter changes
    useEffect(() => {
        if (orders.length === 0) return;
        
        // First filter by payment method
        let result = [...orders];
        if (paymentFilter !== 'all') {
            result = result.filter(order => 
                (order.payment_method || 'Wallet') === paymentFilter
            );
        }
        
        // Then apply sorting
        switch (sortOption) {
            case 'newest':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'highest':
                result.sort((a, b) => b.total_amount - a.total_amount);
                break;
            case 'lowest':
                result.sort((a, b) => a.total_amount - b.total_amount);
                break;
            default:
                break;
        }
        
        setFilteredOrders(result);
    }, [orders, sortOption, paymentFilter]);

    const formatDate = (order) => {
        try {
            if (!order || !order.created_at) {
                return 'Date unavailable';
            }
            
            // First check if there's a readable date in localStorage
            // Only attempt to retrieve from localStorage if order_id exists
            const orderId = order.order_id;
            let readableDate = null;
            
            if (orderId) {
                readableDate = localStorage.getItem(`order_${orderId}_readable_date`);
            }
            
            if (readableDate) {
                return readableDate;
            }
            
            // If not, format the ISO date string in the same format as the Checkout page
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            
            const date = new Date(order.created_at);
            // Check if date is valid before formatting
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            
            return date.toLocaleString('en-IN', options);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    };

    const getStatusBadgeClass = (status) => {
        switch(status.toLowerCase()) {
            case 'pending':
                return 'status-badge ordered';
            case 'ordered':
                return 'status-badge ordered';
            case 'processing':
                return 'status-badge processing';
            case 'completed':
                return 'status-badge completed';
            case 'cancelled':
                return 'status-badge cancelled';
            default:
                return 'status-badge';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getPaymentMethodIcon = (method) => {
        switch(method?.toLowerCase()) {
            case 'card':
                return '💳';
            case 'upi':
                return '🏦';
            case 'wallet':
                return '📱';
            case 'cod':
                return '💵';
            default:
                return '💰';
        }
    };

    // Calculate the monetary value of reward points (1 point = ₹0.1)
    const calculateRewardValue = (points) => {
        return points * 0.1;
    };

    if (loading) return <div className="orders-loading">Loading your orders...</div>;
    if (error) return <div className="orders-error">{error}</div>;

    return (
        <div className="my-orders-container">
            <div className="my-orders-header">
                <h1>My Orders</h1>
                <div className="orders-header-actions">
                    <p>Track and manage all your orders in one place</p>
                    <button 
                        className="back-to-dashboard"
                        onClick={() => navigate('/dashboard')}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="no-orders">
                    <h2>No Orders Yet</h2>
                    <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
                    <button 
                        className="start-shopping-btn"
                        onClick={() => navigate('/dashboard')}
                    >
                        Start Shopping
                    </button>
                </div>
            ) : (
                <>
                    <div className="orders-filter-bar">
                        <div className="filter-section">
                            <label htmlFor="sort-select">Sort by:</label>
                            <select 
                                id="sort-select" 
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="highest">Highest Amount</option>
                                <option value="lowest">Lowest Amount</option>
                            </select>
                        </div>
                        
                        <div className="filter-section">
                            <label htmlFor="payment-filter">Payment Method:</label>
                            <select 
                                id="payment-filter" 
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                            >
                                <option value="all">All Methods</option>
                                {paymentMethods.map((method, index) => (
                                    <option key={index} value={method}>
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="orders-count">
                            Showing {filteredOrders.length} of {orders.length} orders
                        </div>
                    </div>

                    <div className="orders-list">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <div key={order.order_id} className="order-card">
                                    <div className="order-header">
                                        <div className="order-id">
                                            <span>Order #{order.order_id}</span>
                                            <span className={getStatusBadgeClass(order.status)}>
                                                {order.display_status || order.status}
                                            </span>
                                        </div>
                                        <div className="order-date">
                                            <span className="timestamp-label">Ordered on: </span>
                                            {formatDate(order)}
                                        </div>
                                    </div>

                                    <div className="order-items">
                                        {order.items && order.items.map(item => (
                                            <div key={item.order_item_id || `${order.order_id}-${item.product_id}`} className="order-item">
                                                <div className="item-image">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.name} />
                                                    ) : (
                                                        <div className="placeholder-image">No Image</div>
                                                    )}
                                                </div>
                                                <div className="item-details">
                                                    <h3>{item.name}</h3>
                                                    <p className="item-quantity">Quantity: {item.quantity}</p>
                                                    <p className="item-price">{formatCurrency(item.price_at_time)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="order-summary">
                                        <div className="payment-info">
                                            <span className="payment-icon">
                                                {getPaymentMethodIcon(order.payment_method)}
                                            </span>
                                            <span className="label">Payment Method:</span>
                                            <span className="value">{order.payment_method || 'Wallet'}</span>
                                        </div>
                                        
                                        {order.wallet_amount > 0 && (
                                            <div className="wallet-amount">
                                                <span className="label">Wallet Amount:</span>
                                                <span className="value">{formatCurrency(order.wallet_amount)}</span>
                                            </div>
                                        )}
                                        
                                        {order.reward_discount > 0 && (
                                            <div className="reward-discount">
                                                <span className="label">Reward Discount:</span>
                                                <span className="value">{formatCurrency(order.reward_discount)}</span>
                                            </div>
                                        )}
                                        
                                        <div className="total-amount">
                                            <span className="label">Total Amount:</span>
                                            <span className="value">{formatCurrency(order.total_amount)}</span>
                                        </div>
                                        
                                        {order.reward_points_earned > 0 && (
                                            <div className="reward-points">
                                                <span className="label">Reward Points Earned:</span>
                                                <span className="value">
                                                    <span className="points-badge">{order.reward_points_earned} points</span>
                                                    <span className="points-value">
                                                        (Worth {formatCurrency(calculateRewardValue(order.reward_points_earned))})
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-matching-orders">
                                <p>No orders match your selected filters</p>
                                <button 
                                    onClick={() => {
                                        setSortOption('newest');
                                        setPaymentFilter('all');
                                    }}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyOrders; 