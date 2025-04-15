import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';
// ... [imports remain unchanged]
// ... [imports remain unchanged]

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [balance, setBalance] = useState(null);
    const [showBalance, setShowBalance] = useState(false);
    const [cartItemCount, setCartItemCount] = useState(0);
    // Simplified tracking of recent rewards activity
    const [recentRewards, setRecentRewards] = useState({
        hasRecent: false,
        amount: 0,
    });
    const navigate = useNavigate();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [rewardPoints, setRewardPoints] = useState(0);
    const [rewardValue, setRewardValue] = useState(0);

    useEffect(() => {
        console.log("Dashboard mounted.");
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn("No token found, redirecting to login");
            navigate('/login');
            return;
        }
        fetchProducts();
        fetchUserData();
        checkRecentRewardsActivity();
        fetchFeaturedProducts();
        fetchCategories();
        fetchWalletBalance();
        fetchRewardPoints();
    }, [navigate]);

    const fetchProducts = async () => {
        try {
            const url = selectedCategory 
                ? `http://localhost:8000/products/category/${selectedCategory}`
                : 'http://localhost:8000/products';
                
            const response = await axios.get(url);
            console.log("Products fetched:", response.data);
            setAllProducts(response.data);
            setProducts(response.data);

            const uniqueCategories = [...new Set(response.data.map(product => 
                product.business_category || 'Uncategorized'
            ))].sort();
            setCategories(uniqueCategories);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
            setLoading(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log("Fetched token:", token);
            if (!token) {
                console.warn("No token found.");
                navigate('/login');
                return;
            }

            // Set the authorization header for all requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const userResponse = await axios.get('http://localhost:8000/user/me');
            console.log("User data:", userResponse.data);
            setUser(userResponse.data);

            const balanceResponse = await axios.get('http://localhost:8000/user/balance');
            console.log("Balance data:", balanceResponse.data);
            setBalance(balanceResponse.data.balance);

            const cartResponse = await axios.get('http://localhost:8000/api/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Cart data:", cartResponse.data);
            setCartItemCount(cartResponse.data.items?.length || 0);
        } catch (error) {
            console.error('Error fetching user data:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    // Check for recent reward point conversions from localStorage
    const checkRecentRewardsActivity = () => {
        const recentActivity = localStorage.getItem('recent_rewards_activity');
        if (recentActivity) {
            try {
                const activity = JSON.parse(recentActivity);
                // Only show activity from the last 30 minutes
                const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
                if (activity.timestamp > thirtyMinutesAgo) {
                    setRecentRewards({
                        hasRecent: true,
                        amount: activity.amount,
                        points: activity.points
                    });
                    return;
                }
            } catch (e) {
                console.error("Error parsing recent rewards activity", e);
            }
        }
        
        // Clear or initialize if no valid recent activity
        setRecentRewards({ hasRecent: false, amount: 0 });
    };

    // Function to dismiss the rewards notification
    const dismissRewardsNotification = () => {
        setRecentRewards({ hasRecent: false, amount: 0 });
        localStorage.removeItem('recent_rewards_activity');
    };

    const handleAddToCartClick = async (productId, event) => {
        event.stopPropagation();

        if (!localStorage.getItem('token')) {
            alert('Please login to add items to cart');
            navigate('/login');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:8000/api/cart/add', 
                { product_id: productId, quantity: 1 },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setCartItemCount(response.data.items.length);
            alert('Product added to cart successfully!');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert(error.response?.data?.detail || 'Failed to add item to cart.');
        }
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        if (category === 'all') {
            setProducts(allProducts);
        } else {
            setProducts(allProducts.filter(product => product.business_category === category));
        }
    };

    const handleCheckBalance = () => {
        setShowBalance(prev => !prev);
    };

    const handleViewCart = () => {
        navigate('/cart');
    };

    const fetchFeaturedProducts = async () => {
        try {
            const response = await axios.get('http://localhost:8000/featured/products');
            setFeaturedProducts(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching featured products:', err);
            setError('Failed to load featured products');
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('http://localhost:8000/products/categories');
            setCategories(response.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
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

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Welcome, {user?.full_name || 'User'}!</h1>
                    <p className="balance">Wallet Balance: ₹{balance?.toFixed(2) || '0.00'}</p>
                    
                    {/* Recent rewards notification */}
                    {recentRewards.hasRecent && (
                        <div className="rewards-notification">
                            <div className="notification-content">
                                <span className="notification-icon">🎁</span>
                                <p>
                                    <strong>{recentRewards.points} reward points</strong> were automatically converted to 
                                    <strong> ₹{recentRewards.amount.toFixed(2)}</strong> in your wallet!
                                </p>
                            </div>
                            <button 
                                className="dismiss-notification" 
                                onClick={dismissRewardsNotification}
                                title="Dismiss notification"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    
                    {/* Auto-conversion information banner */}
                    <div className="rewards-info-banner">
                        <span className="info-icon">ℹ️</span>
                        <p>
                            Reward points (5% of purchase) are now automatically converted to wallet balance after every order!
                        </p>
                    </div>
                </div>
                <div className="dashboard-actions">
                    <button className="action-button" onClick={() => navigate('/products')}>
                        🛍️ Check Products
                    </button>
                    <button className="action-button" onClick={() => navigate('/cart')}>
                        🛒 View Cart
                    </button>
                    <button className="action-button" onClick={() => navigate('/orders')}>
                        📦 My Orders
                    </button>
                </div>
            </div>

            <div className="wallet-rewards-summary">
                <div className="wallet-summary">
                    <h2>Wallet Balance</h2>
                    <p className="balance-amount">₹{walletBalance.toFixed(2)}</p>
                    <button 
                        className="manage-wallet-btn"
                        onClick={() => navigate('/wallet')}
                    >
                        Manage Wallet
                    </button>
                </div>
                
                <div className="rewards-summary">
                    <h2>Reward Points</h2>
                    <p className="points-info">
                        <span className="points-count">{rewardPoints} points</span>
                        <span className="points-value">(Worth ₹{rewardValue.toFixed(2)})</span>
                    </p>
                    <button 
                        className="convert-points-btn"
                        onClick={() => navigate('/wallet')}
                        disabled={rewardPoints <= 0}
                    >
                        Convert to Wallet
                    </button>
                </div>
            </div>

            <div className="category-filter">
                <button 
                    className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => handleCategorySelect('all')}
                >
                    All Products
                </button>
                {categories.map(category => (
                    <button 
                        key={category}
                        className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => handleCategorySelect(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="products-grid">
                {products.map(product => (
                    <div 
                        key={product.product_id} 
                        className="product-card"
                        onClick={() => handleProductClick(product.product_id)}
                    >
                        <div className="product-image-container">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="product-image" />
                            ) : (
                                <div className="placeholder-image">No Image</div>
                            )}
                            <div className="category-tag">{product.business_category}</div>
                        </div>
                        <div className="product-details">
                            <h3>{product.name}</h3>
                            <p className="product-description">{product.description}</p>
                            <div className="product-price-container">
                                <span className="current-price">₹{product.price}</span>
                                {product.mrp > product.price && (
                                    <span className="original-price">₹{product.mrp}</span>
                                )}
                            </div>
                            <p className="stock-info">In Stock: {product.stock}</p>
                            <div className="add-to-cart-container">
                                <button 
                                    onClick={(e) => handleAddToCartClick(product.product_id, e)}
                                    className="add-to-cart-btn"
                                    disabled={product.stock === 0}
                                >
                                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="featured-products">
                <h2>Featured Products</h2>
                <div className="product-grid">
                    {featuredProducts.map(product => (
                        <div key={product.product_id} className="product-card">
                            <div className="product-image-container">
                                <img 
                                    src={product.image_url || 'https://via.placeholder.com/150'} 
                                    alt={product.name} 
                                    className="product-image"
                                    onClick={() => navigate(`/product/${product.product_id}`)}
                                />
                            </div>
                            <div className="product-details">
                                <h3 className="product-name">{product.name}</h3>
                                <p className="product-price">
                                    <span className="current-price">₹{product.price}</span>
                                    {product.mrp > product.price && (
                                        <span className="original-price">₹{product.mrp}</span>
                                    )}
                                </p>
                                <button 
                                    className="view-product-btn"
                                    onClick={() => navigate(`/product/${product.product_id}`)}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
