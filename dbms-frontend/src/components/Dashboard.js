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
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            if (!isAuthenticated || !user) {
                navigate('/login');
                return;
            }

            try {
                // Fetch balance
                const balanceResponse = await axios.get('http://localhost:8000/wallet/balance', {
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`
                    }
                });
                setBalance(balanceResponse.data.balance);

                // Fetch products
                const productsResponse = await axios.get('http://localhost:8000/products/', {
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

    if (!isAuthenticated) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="dashboard-container">
            <div className="success-message">
                <h1>Welcome to E-Wallet!</h1>
                <p>You have successfully logged in.</p>
                {balance !== null && (
                    <div className="balance-display">
                        <h2>Your Current Balance</h2>
                        <p className="balance-amount">${balance.toFixed(2)}</p>
                    </div>
                )}
            </div>

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