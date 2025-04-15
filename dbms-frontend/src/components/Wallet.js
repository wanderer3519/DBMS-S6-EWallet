import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Wallet.css';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [rewards, setRewards] = useState({ total_points: 0, points_value: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [recentConversions, setRecentConversions] = useState([]);
    const [pointsToConvert, setPointsToConvert] = useState(0);
    const [converting, setConverting] = useState(false);
    
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
            
            // Default points to convert to half of available points
            const halfPoints = Math.floor(response.data.total_points / 2);
            setPointsToConvert(halfPoints > 0 ? halfPoints : 0);
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
    
    const handlePointsToConvertChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            const points = parseInt(value || '0');
            if (points <= rewards.total_points) {
                setPointsToConvert(points);
            } else {
                setPointsToConvert(rewards.total_points);
            }
        }
    };
    
    const handleConvertPoints = async () => {
        if (pointsToConvert <= 0) {
            setError('Please enter a valid number of points to convert');
            return;
        }
        
        try {
            setConverting(true);
            setError('');
            setSuccess('');
            
            const userData = JSON.parse(localStorage.getItem('user') || localStorage.getItem('token'));
            if (!userData) {
                setError('User session expired. Please login again.');
                setConverting(false);
                return;
            }
            
            const token = userData.access_token || userData;
            
            const response = await axios.post('http://localhost:8000/api/account/redeem-rewards', 
                { points: pointsToConvert },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // Update balances
            fetchWalletBalance();
            fetchRewards();
            
            // Calculate the wallet value of the reward points (1 point = ₹0.1)
            const rewardValue = parseFloat((pointsToConvert * 0.1).toFixed(2));
            
            // Store the conversion for display
            const conversion = {
                points: pointsToConvert,
                amount: rewardValue,
                timestamp: Date.now()
            };
            
            localStorage.setItem('recent_rewards_activity', JSON.stringify(conversion));
            setRecentConversions([conversion]);
            
            setSuccess(`Successfully converted ${pointsToConvert} points to ₹${rewardValue} in your wallet!`);
            
            // Reset points to convert
            setPointsToConvert(0);
            
            setConverting(false);
        } catch (err) {
            console.error('Error converting reward points:', err);
            setError(err.response?.data?.detail || 'Failed to convert reward points. Please try again.');
            setConverting(false);
        }
    };
    
    const handleSetMaxPoints = () => {
        setPointsToConvert(rewards.total_points);
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
            {success && <div className="success-message">{success}</div>}

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
                                        ✅ {conversion.points} reward points (₹{conversion.amount}) have been 
                                        added to your wallet!
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
                        
                        <div className="points-conversion">
                            <h4>Convert Points to Wallet Balance</h4>
                            <p>Choose how many points you want to convert to wallet balance</p>
                            
                            <div className="conversion-controls">
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        value={pointsToConvert}
                                        onChange={handlePointsToConvertChange}
                                        className="points-input"
                                        placeholder="Enter points"
                                    />
                                    <button 
                                        className="max-points-button"
                                        onClick={handleSetMaxPoints}
                                    >
                                        Max
                                    </button>
                                </div>
                                
                                <div className="conversion-value">
                                    <p>Value: ₹{(pointsToConvert * 0.1).toFixed(2)}</p>
                                    <p className="remaining-points">
                                        Remaining points after conversion: {rewards.total_points - pointsToConvert}
                                    </p>
                                </div>
                                
                                <button 
                                    className="convert-button"
                                    onClick={handleConvertPoints}
                                    disabled={converting || pointsToConvert <= 0 || pointsToConvert > rewards.total_points}
                                >
                                    {converting ? 'Converting...' : 'Convert Points to Wallet Balance'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="reward-info-notice">
                            <h4>About Your Reward Points</h4>
                            <ul>
                                <li>Earn 5% of order value as reward points</li>
                                <li>Points are updated after each order</li>
                                <li>Convert points to wallet balance at any time</li>
                                <li>Conversion rate: ₹0.10 per point</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet; 