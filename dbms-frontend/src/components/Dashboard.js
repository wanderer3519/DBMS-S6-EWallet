import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBalance, setShowBalance] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            if (!isAuthenticated || !user) {
                navigate('/login');
                return;
            }

            console.log("Dashboard", user);
            try {
                console.log(user);
                console.log(user.user_id);
                // Fetch balance
                const balanceResponse = await axios.get(`http://localhost:8000/api/accounts/${user.user_id}`, {
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`
                    }
                });
                setBalance(balanceResponse.data.balance);

                // Fetch products
                const productsResponse = await axios.get('http://localhost:8000/api/products/', {
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`
                    }
                });
                setProducts(productsResponse.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                if (error.response?.status === 401) {
                    navigate('/login');
                } else {
                    setError('Failed to load data. Please try again.');
                }
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate, user, isAuthenticated]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcome(false);
        }, 10000); // 10 seconds

        return () => clearTimeout(timer); // Clean up
    }, []);

    if (!isAuthenticated) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="dashboard-container">
            {/* Top Right Balance */}
            <div className="top-right">
                <div className="balance-wrapper">
                    <button
                        className="balance-toggle"
                        onClick={() => setShowBalance((prev) => !prev)}
                        onMouseEnter={() => setShowBalance(true)}
                        onMouseLeave={() => setShowBalance(false)}
                    >
                        💰 Check Balance
                        {showBalance && balance !== null && (
                            <div className="balance-popup">
                                <p
                                    className="balance-amount"
                                    style={{
                                        color: balance < 0 ? 'red' : 'green'
                                    }}
                                >
                                    ${balance?.toFixed ? balance.toFixed(2) : "0.00"}
                                </p>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Welcome Message */}
            {showWelcome && (
                <div className="success-message">
                    <h2>Welcome to E-Wallet!</h2>
                    <p>You have successfully logged in.</p>
                </div>
            )}

            {/* Products Section */}
            <div className="products-section">
                <h2>Available Products</h2>
                {loading ? (
                    <p>Loading products...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : products.length > 0 ? (
                    <div className="products-grid">
                        {products.map((product) => (
                            <div key={product.id} className="product-card">
                                <img 
                                    src={product.image_url || 'default-product.png'} 
                                    alt={product.name}
                                    className="product-image"
                                />
                                <h3>{product.name}</h3>
                                <p className="product-price">${product.price}</p>
                                <p className="product-description">{product.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No products available at the moment.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
