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
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        completedOrders: 0
    });
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

            console.log('Fetched orders:', response.data);
            
            // Initially sort orders by date (newest first)
            const sortedOrders = response.data.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
            
            // Find all unique payment methods
            const methods = [...new Set(sortedOrders.map(order => order.payment_method || 'Wallet'))];
            setPaymentMethods(['all', ...methods]);
            
            // Find all unique order statuses
            const statuses = [...new Set(sortedOrders.map(order => 
                order.status.toLowerCase() === 'pending' ? 'ordered' : order.status.toLowerCase()
            ))];
            setOrderStatuses(['all', ...statuses]);
            
            // Transform orders data to change 'pending' status to 'Ordered'
            const transformedOrders = sortedOrders.map(order => ({
                ...order,
                display_status: order.status.toLowerCase() === 'pending' ? 'Ordered' : order.status
            }));
            
            // Calculate stats
            const totalSpent = transformedOrders.reduce((sum, order) => sum + order.total_amount, 0);
            const pendingOrders = transformedOrders.filter(order => 
                order.status.toLowerCase() === 'pending' || order.status.toLowerCase() === 'ordered'
            ).length;
            const completedOrders = transformedOrders.filter(order => 
                order.status.toLowerCase() === 'completed'
            ).length;
            
            setStats({
                totalOrders: transformedOrders.length,
                totalSpent,
                pendingOrders,
                completedOrders
            });
            
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

    // Apply filters and sorting whenever filter criteria changes
    useEffect(() => {
        if (orders.length === 0) return;
        
        let result = [...orders];
        
        // Apply search term filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(order => 
                // Search in order ID
                order.order_id.toString().includes(term) ||
                // Search in items
                order.items.some(item => 
                    item.name.toLowerCase().includes(term)
                )
            );
        }
        
        // Apply date range filter
        if (dateRange.startDate) {
            const startDate = new Date(dateRange.startDate);
            result = result.filter(order => new Date(order.created_at) >= startDate);
        }
        
        if (dateRange.endDate) {
            const endDate = new Date(dateRange.endDate);
            endDate.setHours(23, 59, 59, 999); // End of the day
            result = result.filter(order => new Date(order.created_at) <= endDate);
        }
        
        // Apply payment method filter
        if (paymentFilter !== 'all') {
            result = result.filter(order => 
                (order.payment_method || 'Wallet').toLowerCase() === paymentFilter.toLowerCase()
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(order => {
                const orderStatus = order.status.toLowerCase() === 'pending' ? 'ordered' : order.status.toLowerCase();
                return orderStatus === statusFilter.toLowerCase();
            });
        }
        
        switch (sortOption) {

            case 'oldest':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'newest':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'highest':
                result.sort((a, b) => parseFloat(b.total_amount || 0) - parseFloat(a.total_amount || 0));
                break;
            case 'lowest':
                result.sort((a, b) => parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0));
                break;
        }

        setFilteredOrders(result);
    }, [orders, sortOption, paymentFilter, statusFilter, searchTerm, dateRange]);

    const formatDate = (order) => {
        try {
            if (!order || !order.created_at) {
                return 'Date unavailable';
            }
    
            const orderId = order.order_id;
            let readableDate = orderId ? localStorage.getItem(`order_${orderId}_readable_date`) : null;
    
            if (readableDate) {
                return readableDate;
            }
    
            let date;
    
            // If created_at is a Firestore Timestamp (has toDate), convert it
            if (order.created_at.toDate) {
                date = order.created_at.toDate();
            } else {
                date = new Date(order.created_at);
            }
    
            if (isNaN(date.getTime())) {
                console.warn('Invalid Date detected:', order.created_at);
                return 'Invalid Date';
            }
    
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
    
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
            case 'delivered':
                return 'status-badge completed';
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

    // Get payment method icon
    const getPaymentMethodIcon = (method) => {
        if (typeof method !== 'string') {
            method = method.payment_method || 'wallet';
        }
        
        switch(method.toLowerCase()) {
            case 'card':
                return '💳';
            case 'upi':
                return '🏦';
            case 'wallet':
                return '📱';
            case 'cod':
                return '💵';
            case 'paypal':
                return '🌐';
            case 'netbanking':
                return '🏛️';
            case 'emi':
                return '📅';
            default:
                return '📱'; // Default to wallet icon
        }
    };

    // Get formatted payment method name
    const getPaymentMethodName = (method) => {
        if (typeof method !== 'string') {
            // It's an order object
            const order = method;
            const orderId = order.order_id;
            
            // Try to get from localStorage first
            if (orderId) {
                const storedMethod = localStorage.getItem(`order_${orderId}_payment_method`);
                if (storedMethod) {
                    method = storedMethod;
                } else {
                    method = order.payment_method || 'wallet';
                }
            } else {
                method = order.payment_method || 'wallet';
            }
        }
        
        // Format method string
        switch(method.toLowerCase()) {
            case 'card':
                return 'Credit/Debit Card';
            case 'upi':
                return 'UPI/Net Banking';
            case 'wallet':
                return 'E-Wallet Balance';
            case 'cod':
                return 'Cash on Delivery';
            case 'paypal':
                return 'PayPal';
            case 'netbanking':
                return 'Net Banking';
            case 'emi':
                return 'EMI Payment';
            default:
                return method || 'E-Wallet Balance';
        }
    };

    // Calculate the monetary value of reward points (1 point = ₹0.1)
    const calculateRewardValue = (points) => {
        return points * 0.1;
    };

    const resetFilters = () => {
        setSortOption('newest');
        setPaymentFilter('all');
        setStatusFilter('all');
        setSearchTerm('');
        setDateRange({ startDate: '', endDate: '' });
    };

    if (loading) return <div className="orders-loading">Loading your orders...</div>;
    if (error) return <div className="orders-error">{error}</div>;

    return (
        <div className="my-orders-container">
            <div className="my-orders-header">
                <h1>My Orders</h1>
                <div className="orders-header-actions">
                    <button 
                        className="back-to-dashboard"
                        onClick={() => navigate('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>

            <div className="order-stats-container">
                <div className="order-stat-card">
                    <div className="stat-value">{stats.totalOrders}</div>
                    <div className="stat-label">Total Orders</div>
                </div>
                <div className="order-stat-card">
                    <div className="stat-value">{formatCurrency(stats.totalSpent)}</div>
                    <div className="stat-label">Total Spent</div>
                </div>
                <div className="order-stat-card">
                    <div className="stat-value">{stats.pendingOrders}</div>
                    <div className="stat-label">Pending Orders</div>
                </div>
                <div className="order-stat-card">
                    <div className="stat-value">{stats.completedOrders}</div>
                    <div className="stat-label">Completed Orders</div>
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
                    <div className="orders-search-bar">
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder="Search orders by ID or product name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            {searchTerm && (
                                <button 
                                    className="clear-search" 
                                    onClick={() => setSearchTerm('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="orders-filter-bar">
                        <div className="filter-controls">
                            <div className="filter-section">
                                <label htmlFor="sort-select">Sort by:</label>
                                <select 
                                    id="sort-select" 
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                >
                                    <option value="oldest">Newest First</option>
                                    <option value="newest">Oldest First</option>
                                    <option value="highest">Highest Amount</option>
                                    <option value="lowest">Lowest Amount</option>
                                </select>
                            </div>
                            
                            <div className="filter-section">
                                <label htmlFor="payment-filter">Payment:</label>
                                <select 
                                    id="payment-filter" 
                                    value={paymentFilter}
                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                >
                                    <option value="all">All Methods</option>
                                    {paymentMethods.filter(method => method !== 'all').map((method, index) => (
                                        <option key={index} value={method}>
                                            {getPaymentMethodName(method)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="filter-section">
                                <label htmlFor="status-filter">Status:</label>
                                <select 
                                    id="status-filter" 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    {orderStatuses.filter(status => status !== 'all').map((status, index) => (
                                        <option key={index} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="date-filters">
                            <div className="filter-section">
                                <label htmlFor="start-date">From:</label>
                                <input 
                                    type="date" 
                                    id="start-date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                                />
                            </div>
                            
                            <div className="filter-section">
                                <label htmlFor="end-date">To:</label>
                                <input 
                                    type="date" 
                                    id="end-date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                                />
                            </div>
                            
                            <button 
                                className="reset-filters-btn"
                                onClick={resetFilters}
                            >
                                Reset Filters
                            </button>
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
                                            <div className="payment-method">
                                                <span className="payment-icon">
                                                    {getPaymentMethodIcon(order)}
                                                </span>
                                                <span className="method-name">{getPaymentMethodName(order)}</span>
                                            </div>
                                            
                                            <div className="amount-details">
                                                {order.wallet_amount > 0 && (
                                                    <div className="amount-item">
                                                        <span className="label">Wallet:</span>
                                                        <span className="value">{formatCurrency(order.wallet_amount)}</span>
                                                    </div>
                                                )}
                                                
                                                {order.reward_discount > 0 && (
                                                    <div className="amount-item">
                                                        <span className="label">Rewards:</span>
                                                        <span className="value">-{formatCurrency(order.reward_discount)}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="amount-item total">
                                                    <span className="label">Total:</span>
                                                    <span className="value">{formatCurrency(order.total_amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="order-actions">
                                            {order.reward_points_earned > 0 && (
                                                <div className="reward-points">
                                                    <span className="points-badge">
                                                        +{order.reward_points_earned} points
                                                    </span>
                                                    <span className="points-value">
                                                        (Worth {formatCurrency(calculateRewardValue(order.reward_points_earned))})
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <button 
                                                className="view-details-btn"
                                                onClick={() => navigate(`/order-confirmation/${order.order_id}`)}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-matching-orders">
                                <p>No orders match your selected filters</p>
                                <button 
                                    onClick={resetFilters}
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