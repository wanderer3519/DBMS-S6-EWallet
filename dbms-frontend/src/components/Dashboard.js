import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBalance, setShowBalance] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!isAuthenticated || !user) {
                console.warn('User not authenticated');
                navigate('/login');
                return;
            }

            try {
                // 1. Set balance from user.account
                if (user.account && typeof user.account.balance === 'number') {
                    setBalance(user.account.balance);
                } else {
                    console.warn('No account or balance info found');
                    setBalance(0);
                }

                // 2. Fetch products
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        throw new Error('No authentication token found');
                    }

                    const productsResponse = await axios.get('http://localhost:8000/featured/products', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (productsResponse.data) {
                        setProducts(productsResponse.data);
                    }
                } catch (productError) {
                    console.warn('Error fetching products:', productError);
                    // Continue loading the dashboard even if products fail to load
                    setProducts([]);
                }
                
                // Set loading to false only after all operations are complete
                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                if (err.response?.status === 401) {
                    navigate('/login');
                } else {
                    setError('Failed to load dashboard data. Please try again.');
                }
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, isAuthenticated, navigate]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="dashboard">
            {/* Welcome Message */}
            {showWelcome && (
                <div className="welcome-message">
                    <h2>Welcome, {user?.name || 'User'}!</h2>
                    <button onClick={() => setShowWelcome(false)}>Close</button>
                </div>
            )}

            {/* Balance Section */}
            <div className="balance-section">
                <h3>Your Balance</h3>
                <div className="balance-display">
                    {showBalance ? (
                        <span className="balance-amount">₹{balance.toFixed(2)}</span>
                    ) : (
                        <span className="balance-amount">••••••</span>
                    )}
                    <button
                        className="show-balance-btn"
                        onClick={() => setShowBalance(!showBalance)}
                    >
                        {showBalance ? 'Hide Balance' : 'Show Balance'}
                    </button>
                </div>
            </div>

            {/* Products Section */}
            <div className="products-section">
                <h3>Available Products</h3>
                {products.length > 0 ? (
                    <div className="products-grid">
                        {products.map(product => (
                            <div key={product.product_id || product.id} className="product-card">
                                {product.image_url && (
                                    <div className="product-image">
                                        <img src={product.image_url} alt={product.name} />
                                    </div>
                                )}
                                <h4>{product.name}</h4>
                                <p className="product-description">{product.description}</p>
                                <div className="product-price-container">
                                    <p className="price">₹{product.price}</p>
                                    {product.mrp > product.price && (
                                        <p className="mrp">₹{product.mrp}</p>
                                    )}
                                </div>
                                <button className="add-to-cart-btn">Add to Cart</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-products-message">
                        <p>No products available at the moment. Check back later!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
