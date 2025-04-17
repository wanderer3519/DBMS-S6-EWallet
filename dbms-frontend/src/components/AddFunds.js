import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/AddFunds.css';

const AddFunds = () => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvv: ''
    });
    const navigate = useNavigate();

    const predefinedAmounts = [100, 500, 1000, 2000, 5000];

    const handleAmountSelect = (value) => {
        setAmount(value.toString());
    };

    const handleCustomAmount = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 10000)) {
            setAmount(value);
        }
    };

    const handleProceed = () => {
        if (!amount || parseInt(amount) < 1) {
            setError('Please enter a valid amount');
            return;
        }
        setShowPaymentForm(true);
        setError(null);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }

            const { access_token } = JSON.parse(userData);
            const response = await axios.post(
                'http://localhost:8000/api/account/add-funds',
                {
                    amount: parseFloat(amount),
                    payment_method: paymentMethod
                },
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Error adding funds:', err);
            setError(err.response?.data?.detail || 'Failed to add funds. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="add-funds-container">
                <div className="success-message">
                    <h2>✅ Success!</h2>
                    <p>₹{amount} has been added to your wallet</p>
                    <p>Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="add-funds-container">
            <div className="add-funds-header">
                <h1>Add Money to Wallet</h1>
                <button 
                    className="back-button"
                    onClick={() => navigate('/dashboard')}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {!showPaymentForm ? (
                <div className="amount-selection">
                    <div className="predefined-amounts">
                        {predefinedAmounts.map((value) => (
                            <button
                                key={value}
                                className={`amount-button ${amount === value.toString() ? 'selected' : ''}`}
                                onClick={() => handleAmountSelect(value)}
                            >
                                ₹{value}
                            </button>
                        ))}
                    </div>

                    <div className="custom-amount">
                        <label>Or enter custom amount:</label>
                        <div className="input-group">
                            <span className="currency-symbol">₹</span>
                            <input
                                type="text"
                                value={amount}
                                onChange={handleCustomAmount}
                                placeholder="Enter amount"
                                maxLength="5"
                            />
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button 
                        className="proceed-button"
                        onClick={handleProceed}
                        disabled={!amount || loading}
                    >
                        Proceed to Pay
                    </button>
                </div>
            ) : (
                <div className="payment-form">
                    <h2>Payment Details</h2>
                    <p className="amount-display">Amount to Add: ₹{amount}</p>

                    <form onSubmit={handlePaymentSubmit}>
                        <div className="payment-methods">
                            <label className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="card"
                                    checked={paymentMethod === 'card'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                💳 Credit/Debit Card
                            </label>
                            <label className={`payment-method ${paymentMethod === 'upi' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="upi"
                                    checked={paymentMethod === 'upi'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                📱 UPI
                            </label>
                        </div>

                        {paymentMethod === 'card' && (
                            <div className="card-details">
                                <div className="form-group">
                                    <label>Card Number</label>
                                    <input
                                        type="text"
                                        value={cardDetails.number}
                                        onChange={(e) => setCardDetails({
                                            ...cardDetails,
                                            number: e.target.value.replace(/\D/g, '').slice(0, 16)
                                        })}
                                        placeholder="1234 5678 9012 3456"
                                        maxLength="16"
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Expiry Date</label>
                                        <input
                                            type="text"
                                            value={cardDetails.expiry}
                                            onChange={(e) => setCardDetails({
                                                ...cardDetails,
                                                expiry: e.target.value.replace(/\D/g, '').slice(0, 4)
                                            })}
                                            placeholder="MM/YY"
                                            maxLength="4"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>CVV</label>
                                        <input
                                            type="password"
                                            value={cardDetails.cvv}
                                            onChange={(e) => setCardDetails({
                                                ...cardDetails,
                                                cvv: e.target.value.replace(/\D/g, '').slice(0, 3)
                                            })}
                                            placeholder="123"
                                            maxLength="3"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'upi' && (
                            <div className="upi-details">
                                <div className="form-group">
                                    <label>UPI ID</label>
                                    <input
                                        type="text"
                                        placeholder="username@upi"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        <div className="form-actions">
                            <button 
                                type="button" 
                                className="back-button"
                                onClick={() => setShowPaymentForm(false)}
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button 
                                type="submit" 
                                className="pay-button"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : `Pay ₹${amount}`}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AddFunds; 