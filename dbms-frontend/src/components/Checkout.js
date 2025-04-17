import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [walletBalance, setWalletBalance] = useState(0);
    const [rewardPoints, setRewardPoints] = useState(0);
    const [rewardValue, setRewardValue] = useState(0);
    const [useWallet, setUseWallet] = useState(false);
    const [useRewards, setUseRewards] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [estimatedRewardPoints, setEstimatedRewardPoints] = useState(0);

    useEffect(() => {
        fetchCartItems();
        fetchWalletBalance();
        fetchRewardPoints();
    }, []);

    useEffect(() => {
        // Calculate estimated reward points (5% of total order value)
        if (total > 0 && paymentMethod !== 'cod') {
            const estimated = Math.floor(total * 0.05);
            setEstimatedRewardPoints(estimated);
        } else {
            setEstimatedRewardPoints(0);
        }
    }, [total, paymentMethod]);

    const fetchCartItems = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            console.log('Fetching cart items in Checkout component...');
            const response = await axios.get('http://localhost:8000/api/cart', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            console.log('Cart response:', response.data);
            if (response.data.items && response.data.items.length > 0) {
                setCartItems(response.data.items);
                setTotal(response.data.total_amount);
            } else {
                setError('Your cart is empty. Please add items before checkout.');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching cart items:', err);
            setError('Failed to load cart items. Please try again.');
            setLoading(false);
        }
    };

    const fetchWalletBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('http://localhost:8000/api/account/balance', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setWalletBalance(response.data.balance);
        } catch (err) {
            console.error('Error fetching wallet balance:', err);
        }
    };

    const fetchRewardPoints = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('http://localhost:8000/api/account/rewards', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setRewardPoints(response.data.total_points);
            setRewardValue(response.data.points_value);
        } catch (err) {
            console.error('Error fetching reward points:', err);
        }
    };

    const handlePaymentMethodChange = (method) => {
        setPaymentMethod(method);
        
        // Reset wallet and rewards usage when changing payment method
        if (method === 'cod') {
            setUseWallet(false);
            setUseRewards(false);
        }
    };

    const handlePointsToUseChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            const points = parseInt(value || '0');
            if (points <= rewardPoints) {
                setPointsToUse(points);
            }
        }
    };

    const handleCheckout = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('Authentication token not found. Please log in again.');
                setProcessing(false);
                navigate('/login');
                return;
            }
            
            console.log('Processing checkout with token:', token ? 'token exists' : 'no token');
            
            // Get precise current date and time with timezone information
            const now = new Date();
            // Format: YYYY-MM-DDTHH:MM:SS.mmmZ (ISO 8601)
            const orderDateTime = now.toISOString();
            // Also format in a more human-readable format for display
            const readableDateTime = now.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            const checkoutData = {
                payment_method: paymentMethod,
                use_wallet: useWallet,
                use_rewards: useRewards,
                reward_points: useRewards ? pointsToUse : 0,
                order_date: orderDateTime
            };
            
            console.log('Checkout data:', checkoutData);
            
            const response = await axios.post('http://localhost:8000/api/checkout', checkoutData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Checkout response:', response.data);
            
            if (response.data && response.data.order_id) {
                // Store both ISO and readable datetime formats in localStorage
                localStorage.setItem(`order_${response.data.order_id}_date`, orderDateTime);
                localStorage.setItem(`order_${response.data.order_id}_readable_date`, readableDateTime);
                localStorage.setItem(`order_${response.data.order_id}_payment_method`, paymentMethod || 'Wallet');
                
                // Navigate to the order confirmation page with the order ID
                navigate(`/order-confirmation/${response.data.order_id}`);
            } else {
                setError('Failed to process checkout. Please try again.');
                setProcessing(false);
            }
        } catch (err) {
            console.error('Error during checkout:', err);
            console.error('Response data:', err.response?.data);
            setError(err.response?.data?.detail || 'Failed to process checkout. Please try again.');
            setProcessing(false);
        }
    };

    if (loading) return <div className="checkout-loading">Loading your cart... Please wait.</div>;
    if (error) return <div className="checkout-error">{error}</div>;

    return (
        <div className="checkout-container">
            <h1>🛒 Checkout</h1>
            <div className="checkout-content">
                <div className="order-summary">
                    <h2>Order Summary</h2>
                    {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                            <div key={item.cart_item_id} className="checkout-item">
                                <img 
                                    src={item.image_url || 'https://via.placeholder.com/100'} 
                                    alt={item.name} 
                                    className="checkout-item-image" 
                                />
                                <div className="checkout-item-details">
                                    <h3>{item.name}</h3>
                                    <p>Quantity: {item.quantity}</p>
                                    <p>Price: ₹{item.price}</p>
                                    <p>Subtotal: ₹{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No items in your cart</p>
                    )}
                </div>
                <div className="checkout-summary">
                    <h2>Total Amount</h2>
                    <p className="total-amount">₹{total.toFixed(2)}</p>

                    <div className="payment-methods">
                        <h3>Please choose your preferred mode of payment:</h3>
                        
                        <div className="payment-option">
                            <label className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="card" 
                                    checked={paymentMethod === 'card'} 
                                    onChange={() => handlePaymentMethodChange('card')} 
                                />
                                <span className="payment-icon">💳</span>
                                <span className="payment-label">Credit / Debit Card</span>
                            </label>
                        </div>
                        
                        <div className="payment-option">
                            <label className={`payment-method ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="upi" 
                                    checked={paymentMethod === 'upi'} 
                                    onChange={() => handlePaymentMethodChange('upi')} 
                                />
                                <span className="payment-icon">🏦</span>
                                <span className="payment-label">UPI / Net Banking</span>
                            </label>
                        </div>
                        
                        <div className="payment-option">
                            <label className={`payment-method ${paymentMethod === 'wallet' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="wallet" 
                                    checked={paymentMethod === 'wallet'} 
                                    onChange={() => handlePaymentMethodChange('wallet')} 
                                />
                                <span className="payment-icon">📱</span>
                                <span className="payment-label">Wallet / E-Wallet</span>
                                {paymentMethod === 'wallet' && (
                                    <div className="wallet-info">
                                        <p>Available balance: ₹{walletBalance.toFixed(2)}</p>
                                    </div>
                                )}
                            </label>
                        </div>
                        
                        <div className="payment-option">
                            <label className={`payment-method ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="cod" 
                                    checked={paymentMethod === 'cod'} 
                                    onChange={() => handlePaymentMethodChange('cod')} 
                                />
                                <span className="payment-icon">💵</span>
                                <span className="payment-label">Cash on Delivery</span>
                                <span className="payment-note">(No reward points will be added)</span>
                            </label>
                        </div>
                    </div>

                    {paymentMethod !== 'cod' && walletBalance > 0 && (
                        <div className="use-wallet">
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={useWallet} 
                                    onChange={() => setUseWallet(!useWallet)} 
                                />
                                Use wallet balance (₹{walletBalance.toFixed(2)})
                            </label>
                        </div>
                    )}

                    {paymentMethod !== 'cod' && rewardPoints > 0 && (
                        <div className="use-rewards">
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={useRewards} 
                                    onChange={() => setUseRewards(!useRewards)} 
                                />
                                Use reward points ({rewardPoints} points, worth ₹{rewardValue.toFixed(2)})
                            </label>
                            {useRewards && (
                                <div className="points-to-use">
                                    <label>
                                        Points to use:
                                        <input 
                                            type="text"
                                            value={pointsToUse}
                                            onChange={handlePointsToUseChange}
                                        />
                                    </label>
                                    <p>Value: ₹{(pointsToUse * 0.1).toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="reward-points-info">
                        <h3>🎁 Reward Points:</h3>
                        {paymentMethod !== 'cod' ? (
                            <>
                                <p>You will earn <strong>{estimatedRewardPoints} points</strong> on this purchase when using any mode of payment except Cash on Delivery.</p>
                                <p className="auto-conversion-note">
                                    <strong>Automatic Conversion:</strong> These points (worth ₹{(estimatedRewardPoints * 0.1).toFixed(2)}) will be automatically added to your E-Wallet balance!
                                </p>
                            </>
                        ) : (
                            <p>No reward points will be earned with Cash on Delivery.</p>
                        )}
                    </div>

                    <button 
                        className="checkout-button"
                        onClick={handleCheckout}
                        disabled={processing || cartItems.length === 0}
                    >
                        {processing ? 'Processing...' : 'Complete Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout; 