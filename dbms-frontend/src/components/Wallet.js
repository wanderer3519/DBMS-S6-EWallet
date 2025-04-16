import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Wallet.css';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [rewards, setRewards] = useState({ total_points: 0, points_value: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recentConversions, setRecentConversions] = useState([]);
    
    useEffect(() => {
        fetchWalletBalance();
        fetchRewards();
        fetchRecentConversions();
    }, []);

    const fetchWalletBalance = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || localStorage.getItem('token'));
            if (!userData) {
                setError('User session expired. Please login again.');
                return;
            }
            
            const token = userData.access_token || userData;
            
            const response = await axios.get('http://localhost:8000/api/account/balance', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setBalance(response.data.balance);
        } catch (err) {
            console.error('Error fetching wallet balance:', err);
            setError('Failed to fetch wallet balance');
        }
    };

    const fetchRewards = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || localStorage.getItem('token'));
            if (!userData) {
                return;
            }
            
            const token = userData.access_token || userData;
            
            const response = await axios.get('http://localhost:8000/api/account/rewards', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setRewards(response.data);
        } catch (err) {
            console.error('Error fetching rewards:', err);
            setError('Failed to fetch rewards');
        }
    };

    const fetchRecentConversions = async () => {
        // Check if there's any recent rewards activity in localStorage
        const recentActivity = localStorage.getItem('recent_rewards_activity');
        if (recentActivity) {
            try {
                const activity = JSON.parse(recentActivity);
                if (activity && activity.timestamp) {
                    // Only show activities from the last 24 hours
                    const isRecent = (Date.now() - activity.timestamp) < 24 * 60 * 60 * 1000;
                    if (isRecent) {
                        setRecentConversions([activity]);
                    }
                }
            } catch (err) {
                console.error('Error parsing recent rewards activity:', err);
            }
        }
    };

    return (
        <div className="wallet-container">
            <div className="wallet-header">
                <h2>My Wallet</h2>
                <button className="back-to-dashboard" onClick={() => window.history.back()}>
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="wallet-content">
                <div className="wallet-section">
                    <div className="section-header">
                        <h3>Wallet Balance</h3>
                        <span className="balance">₹{balance.toFixed(2)}</span>
                    </div>
                    
                    <div className="balance-info">
                        <p>Use your wallet balance for faster checkout</p>
                        <p>Your wallet balance is automatically updated after each order</p>
                    </div>
                    
                    {recentConversions.length > 0 && (
                        <div className="recent-conversions">
                            <h4>Recent Wallet Updates</h4>
                            {recentConversions.map((conversion, index) => (
                                <div key={index} className="conversion-item">
                                    <p>
                                        ✅ {conversion.points} reward points (₹{conversion.amount}) from Order #{conversion.orderId} 
                                        were automatically added to your wallet!
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="wallet-section">
                    <div className="section-header">
                        <h3>Reward Points</h3>
                        <span className="points">{rewards.total_points} points</span>
                    </div>

                    <div className="rewards-info">
                        <p>Your points are worth: ₹{rewards.points_value.toFixed(2)}</p>
                        <p className="points-rate">Rate: 1 point = ₹0.10</p>
                        <div className="auto-conversion-notice">
                            <h4>Automatic Conversion</h4>
                            <p>Your reward points are automatically converted to wallet balance after each order!</p>
                            <ul>
                                <li>Earn 5% of order value as reward points</li>
                                <li>Points are automatically converted to wallet balance</li>
                                <li>Conversion happens at the rate of ₹0.10 per point</li>
                                <li>No manual action needed - your wallet is updated automatically</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet; 