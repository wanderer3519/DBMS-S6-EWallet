import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RewardsConversion.css';

const RewardsConversion = () => {
    const navigate = useNavigate();
    const [rewardPoints, setRewardPoints] = useState({
        total_points: 0,
        points_value: 0,
        rewards: []
    });
    const [balance, setBalance] = useState(0);
    const [pointsToConvert, setPointsToConvert] = useState('');
    const [convertedValue, setConvertedValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        
        fetchRewardPoints();
        fetchWalletBalance();
    }, [navigate]);

    // Calculate converted value whenever pointsToConvert changes
    useEffect(() => {
        const points = parseInt(pointsToConvert) || 0;
        const value = (points * 0.1).toFixed(2);
        setConvertedValue(value);
    }, [pointsToConvert]);

    const fetchRewardPoints = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.get('http://localhost:8000/api/account/rewards', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log("Reward points data:", response.data);
            setRewardPoints(response.data);
            // Initialize points to convert with total available points
            setPointsToConvert(response.data.total_points.toString());
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reward points:', error);
            // Ensure error is a string
            setError('Failed to load reward points. Please try again.');
            setLoading(false);
        }
    };

    const fetchWalletBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get('http://localhost:8000/user/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log("Wallet balance:", response.data);
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            // Handle wallet balance fetch error, but don't set error state to avoid UI issues
        }
    };

    const handlePointsChange = (e) => {
        const value = e.target.value;
        // Only allow numeric input
        if (value === '' || /^\d+$/.test(value)) {
            setPointsToConvert(value);
        }
    };

    const handleMaxPoints = () => {
        setPointsToConvert(rewardPoints.total_points.toString());
    };

    // Let's create a modified endpoint handler that will talk directly to the backend
    const handleConvertPoints = async () => {
        const points = parseInt(pointsToConvert);
        
        if (!points || points <= 0) {
            setError('Please enter a valid number of points to convert.');
            return;
        }
        
        if (points > rewardPoints.total_points) {
            setError(`You only have ${rewardPoints.total_points} points available.`);
            return;
        }

        try {
            setConverting(true);
            setError(null);
            setSuccess(null);
            
            const token = localStorage.getItem('token');
            
            console.log("Will convert points:", points);
            
            // Call a separate API endpoint that I know works with the server
            const response = await fetch(`http://localhost:8000/api/account/redeem-rewards/${points}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Conversion response:", data);
            
            // Update UI with response data
            if (data && data.new_balance) {
                // Update the balance
                setBalance(data.new_balance);
                
                // Calculate the converted value
                const convertedValue = (points * 0.1).toFixed(2);
                
                // Store the conversion activity in localStorage
                localStorage.setItem('recent_rewards_activity', JSON.stringify({
                    orderId: 'manual-conversion',
                    points: points,
                    amount: parseFloat(convertedValue),
                    timestamp: Date.now()
                }));
                
                // Clear the points to convert input
                setPointsToConvert('');
                
                // Show success message
                setSuccess(`Successfully converted ${points} points to ₹${convertedValue} in your wallet!`);
                
                // Refresh reward points
                fetchRewardPoints();
            } else {
                console.error("Invalid response format:", data);
                setError('Received an invalid response from the server. Please try again.');
            }
        } catch (error) {
            console.error('Error converting reward points:', error);
            setError(error.message || 'Failed to convert reward points. Please try again.');
        } finally {
            setConverting(false);
        }
    };

    if (loading) return <div className="rewards-conversion-loading">Loading your reward points...</div>;

    return (
        <div className="rewards-conversion-container">
            <div className="conversion-header">
                <h1>Convert Reward Points to Wallet Balance</h1>
                <button className="back-to-dashboard" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
            
            <div className="conversion-content">
                <div className="balance-info-section">
                    <div className="balance-card">
                        <h2>Wallet Balance</h2>
                        <p className="balance-amount">₹{balance.toFixed(2)}</p>
                    </div>
                    
                    <div className="rewards-card">
                        <h2>Available Reward Points</h2>
                        <p className="points-amount">{rewardPoints.total_points} points</p>
                        <p className="points-value">Worth ₹{rewardPoints.points_value.toFixed(2)}</p>
                    </div>
                </div>
                
                <div className="conversion-form">
                    <h2>Convert Points to Balance</h2>
                    
                    {error && <div className="conversion-error">{String(error)}</div>}
                    {success && <div className="conversion-success">{success}</div>}
                    
                    <div className="form-group">
                        <label htmlFor="pointsToConvert">Points to Convert:</label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                id="pointsToConvert"
                                value={pointsToConvert}
                                onChange={handlePointsChange}
                                disabled={converting || rewardPoints.total_points <= 0}
                            />
                            <button 
                                className="max-points-btn"
                                onClick={handleMaxPoints}
                                disabled={converting || rewardPoints.total_points <= 0}
                            >
                                MAX
                            </button>
                        </div>
                    </div>
                    
                    <div className="conversion-preview">
                        <p>You will receive: <span className="converted-value">₹{convertedValue}</span></p>
                        <p className="conversion-rate">Conversion Rate: 1 point = ₹0.10</p>
                    </div>
                    
                    <button 
                        className="convert-btn"
                        onClick={handleConvertPoints}
                        disabled={converting || !pointsToConvert || parseInt(pointsToConvert) <= 0 || parseInt(pointsToConvert) > rewardPoints.total_points}
                    >
                        {converting ? 'Converting...' : 'Convert Points'}
                    </button>
                </div>
                
                <div className="conversion-history">
                    <h2>Recent Reward Points Activity</h2>
                    {rewardPoints.rewards && rewardPoints.rewards.length > 0 ? (
                        <div className="rewards-list">
                            {rewardPoints.rewards.map((reward, index) => (
                                <div key={index} className="reward-item">
                                    <div className="reward-details">
                                        <p className="reward-points">{reward.points} points</p>
                                        <p className="reward-date">{new Date(reward.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <p className="reward-value">₹{(reward.points * 0.1).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-rewards">No recent reward point activity</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RewardsConversion; 