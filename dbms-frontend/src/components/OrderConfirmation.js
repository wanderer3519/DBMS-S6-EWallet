import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [orderDetails, setOrderDetails] = useState(null);
    const [orderDate, setOrderDate] = useState(null);
    const [readableOrderDate, setReadableOrderDate] = useState(null);
    const [storedPaymentMethod, setStoredPaymentMethod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [walletUpdated, setWalletUpdated] = useState(false);

    useEffect(() => {
        fetchOrderDetails();
        
        // Get order date and payment method from localStorage
        const storedOrderDate = localStorage.getItem(`order_${orderId}_date`);
        const readableDate = localStorage.getItem(`order_${orderId}_readable_date`);
        const paymentMethod = localStorage.getItem(`order_${orderId}_payment_method`);
        
        if (storedOrderDate) {
            setOrderDate(storedOrderDate);
        }
        
        if (readableDate) {
            setReadableOrderDate(readableDate);
        }
        
        if (paymentMethod) {
            setStoredPaymentMethod(paymentMethod);
        }
    }, [orderId]);



    // Get formatted payment method name
    const getFormattedPaymentMethod = (method) => {
        if (!method) {
            return 'E-Wallet Balance';
        }
        
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
                return method;
        }
    };

    const formatDate = (dateInput, type = 'full') => {
        try {
            if (!dateInput) return 'Date unavailable';
    
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return 'Invalid Date';
    
            if (type === 'date') {
                return date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            } else if (type === 'time') {
                console.log('Formatting time:', date);
                return date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            }
    
            // Full date and time
            return date.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return 'Invalid Date';
        }
    };
    
      

    const fetchOrderDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to view order details');
                setLoading(false);
                return;
            }

            const response = await axios.get(`http://localhost:8000/api/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setOrderDetails(response.data);
            
            // If we have a created_at timestamp from the API and no localStorage date
            if (response.data.created_at && !orderDate) {
                setOrderDate(response.data.created_at);
            }
            
            // Check if wallet has been updated with reward points
            if (response.data.reward_points_earned > 0 && response.data.payment_method !== 'cod') {
                // Calculate the wallet value of the reward points (1 point = ₹0.1)
                const rewardValue = parseFloat((response.data.reward_points_earned * 0.1).toFixed(2));
                
                // Check if reward points have been processed (indicated by wallet_amount field)
                if (response.data.wallet_amount > 0) {
                    setWalletUpdated(true);
                }
                
                // Store the reward activity in localStorage for dashboard notification
                localStorage.setItem('recent_rewards_activity', JSON.stringify({
                    orderId: response.data.order_id,
                    points: response.data.reward_points_earned,
                    amount: rewardValue,
                    timestamp: Date.now()
                }));
            }
            
            setLoading(false);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError(err.response?.data?.detail || 'Failed to load order details');
            setLoading(false);
        }
    };

    if (loading) return <div className="order-confirmation-loading">Loading order details...</div>;
    if (error) return <div className="order-confirmation-error">{error}</div>;
    if (!orderDetails) return <div className="order-confirmation-error">Order not found</div>;

    // Use stored payment method if available, otherwise use the one from API
    const displayPaymentMethod = storedPaymentMethod || orderDetails.payment_method || 'wallet';
    const formattedPaymentMethod = getFormattedPaymentMethod(displayPaymentMethod);
    
    // Calculate reward points value (1 point = ₹0.1)
    const rewardPointsValue = orderDetails.reward_points_earned > 0 
        ? (orderDetails.reward_points_earned * 0.1).toFixed(2) 
        : '0.00';

    return (
        <div className="order-confirmation-container">
            <div className="order-confirmation-content">
                <div className="success-header">
                    <span className="success-icon">✅</span>
                    <h1>Order Placed Successfully!</h1>
                    <p className="thank-you">Thank you for your purchase.</p>
                </div>
                <p className="order-date">
                    <span className="label">Order Date:</span> {formatDate(orderDate, 'date')}
                </p>
                <p className="order-time">
                    <span className="label">Time:</span> {formatDate(orderDate, 'time')}
                </p>

                <div className="order-info">
                    <h2>🛍️ Order Details</h2>
                    <p className="order-id">Order ID: #{orderDetails.order_id}</p>
                    {orderDate && (
                        <p className="order-date">
                            <span className="label">Order Date:</span> {formatDate(orderDate)}
                        </p>
                    )}
                    
                    {/* Payment confirmation message - exact wording as specified */}
                    <div className="payment-confirmation">
                        <p className="payment-success">
                            Your order has been successfully placed using <strong>{formattedPaymentMethod}</strong>.
                        </p>
                    </div>
                    
                    <p className="order-total">
                        <span className="label">Total Amount:</span> ₹{orderDetails.total_amount.toFixed(2)}
                    </p>
                    
                    {/* Reward points information - exact wording as specified */}
                    {orderDetails.reward_points_earned > 0 && displayPaymentMethod.toLowerCase() !== 'cod' && (
                        <div className="reward-points">
                            <h3>🎁 Reward Points</h3>
                            <p className="reward-conversion">
                                You've earned {orderDetails.reward_points_earned} reward points, which equals <strong>₹{rewardPointsValue}</strong> and has been added to your E-Wallet!
                            </p>
                            
                            {/* Display wallet update status */}
                            <div className={`wallet-update-status ${walletUpdated ? 'completed' : 'pending'}`}>
                                <p>
                                    <span className="status-icon">{walletUpdated ? '✅' : '⏳'}</span>
                                    <span className="status-text">
                                        {walletUpdated 
                                            ? `₹${rewardPointsValue} has been added to your E-Wallet!` 
                                            : `₹${rewardPointsValue} will be added to your E-Wallet shortly.`}
                                    </span>
                                </p>
                            </div>
                            <p className="points-usage-info">
                                Your reward points are automatically converted to wallet balance after each order!
                            </p>
                        </div>
                    )}
                    
                    {displayPaymentMethod.toLowerCase() === 'cod' && (
                        <p className="cod-note">Note: Reward points are not added for Cash on Delivery</p>
                    )}
                </div>

                <div className="next-steps">
                    <h2>🔘 What's Next?</h2>
                    <div className="action-buttons">
                        <button 
                            className="back-shopping"
                            onClick={() => navigate('/dashboard')}
                        >
                            🔙 Back to Shopping
                        </button>
                        <button 
                            className="view-orders"
                            onClick={() => navigate('/orders')}
                        >
                            📄 Go to My Orders
                        </button>
                    </div>
                </div>

                <div className="dashboard-update">
                    <h2>🧾 Dashboard Update</h2>
                    <p>In your dashboard, a new "My Orders" section is now available where you can:</p>
                    <ul>
                        <li>View all your past orders</li>
                        <li>Track current order status</li>
                        <li>Sort orders by date, amount, or payment method</li>
                    </ul>
                    {orderDetails.reward_points_earned > 0 && displayPaymentMethod.toLowerCase() !== 'cod' && (
                        <p className="reward-update">
                            {walletUpdated 
                                ? "Your reward points have been automatically converted to wallet balance! Your dashboard shows the updated balance. 🎉" 
                                : "Your reward points will be automatically converted to wallet balance! Check your dashboard for the updated wallet balance. 🎉"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;