import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

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
    }, [navigate]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get('http://localhost:8000/products');
            console.log("Products fetched:", response.data);
            setAllProducts(response.data);
            setProducts(response.data);

            const uniqueCategories = [...new Set(response.data.map(product => 
                product.business_category || 'Uncategorized'
            ))].sort();
            setCategories(uniqueCategories);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to load products. Please try again.');
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

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Welcome to E-Wallet Shop</h1>
                {user && (
                    <div className="user-info">
                        <div className="top-left">
                            <span>Hello, {user.full_name}</span>
                        </div>
                        <div className="top-right">
                            <div className="balance-wrapper">
                                <button className="balance-toggle" onClick={handleCheckBalance}>
                                    💰 Check Balance
                                </button>
                                {showBalance && balance !== null && (
                                    <div className="balance-popup">
                                        <p className="balance-amount" style={{ color: balance < 0 ? 'red' : 'green' }}>
                                            ₹{balance.toFixed(2)}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleViewCart} className="cart-button">
                                🛒 View Cart ({cartItemCount})
                            </button>
                            <button onClick={() => navigate('/products')} className="check-product-button">
                                🔍 Check Products
                            </button>
                            <button onClick={() => navigate('/profile')} className="profile-button">
                                👤 Profile
                            </button>
                        </div>
                    </div>
                )}
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
        </div>
    );
};

export default Dashboard;
