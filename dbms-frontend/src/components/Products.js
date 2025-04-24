import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Products.css';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:8000/products');
            
            // Process products to ensure all fields are available
            const processedProducts = response.data.map(product => ({
                ...product,
                business_category: product.business_category || 'Uncategorized'
            }));
            
            setAllProducts(processedProducts);
            setProducts(processedProducts);
            
            // Extract unique categories
            const uniqueCategories = [...new Set(processedProducts.map(product => 
                product.business_category || 'Uncategorized'
            ))].sort();
            
            setCategories(uniqueCategories);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products. Please try again.');
            setLoading(false);
        }
    };

    const handleAddToCart = async (productId, event) => {
        event.stopPropagation(); // Prevent navigating to product details

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to add items to cart');
                setTimeout(() => setError(null), 3000);
                return;
            }

            const response = await axios.post(
                'http://localhost:8000/api/cart/add',
                { product_id: productId, quantity: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess('Product added to cart successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add item to cart.');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    const handleSearch = () => {
        applyFilters(selectedCategory, searchTerm);
    };

    const handleResetSearch = () => {
        setSearchTerm('');
        applyFilters(selectedCategory, '');
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        applyFilters(category, searchTerm);
    };

    const applyFilters = (category, search) => {
        let filteredProducts = [...allProducts];
        
        // Apply category filter
        if (category !== 'all') {
            filteredProducts = filteredProducts.filter(
                product => product.business_category === category
            );
        }
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredProducts = filteredProducts.filter(
                product => 
                    product.name.toLowerCase().includes(searchLower) || 
                    product.description.toLowerCase().includes(searchLower)
            );
        }
        
        setProducts(filteredProducts);
    };

    const calculateDiscount = (mrp, price) => {
        if (mrp <= price) return 0;
        return Math.round(((mrp - price) / mrp) * 100);
    };

    if (loading) {
        return <div className="products-loading">Loading products...</div>;
    }

    return (
        <div className="products-container">
            <div className="products-header">
                <h1>Product Catalog</h1>
                <p>Browse our selection of products and add them to your cart</p>
            </div>

            <div className="search-filter-section">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search products by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="search-btn" onClick={handleSearch}>Search</button>
                    <button className="reset-btn" onClick={handleResetSearch}>Reset</button>
                </div>

                <div className="category-filters">
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
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {products.length === 0 ? (
                <div className="no-products">
                    <p>No products found. Try a different search term or category.</p>
                </div>
            ) : (
                <div className="products-grid">
                    {products.map(product => (
                        <div 
                            key={product.product_id} 
                            className="product-card"
                            onClick={() => handleProductClick(product.product_id)}
                        >
                            <div className="product-image-container">
                                {product.image_url ? (
                                    <img 
                                        src={product.image_url} 
                                        alt={product.name} 
                                        className="product-image" 
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                        }}
                                    />
                                ) : (
                                    <div className="placeholder-image">No Image</div>
                                )}
                                <div className="category-tag">{product.business_category}</div>
                                {calculateDiscount(product.mrp, product.price) > 0 && (
                                    <div className="discount-tag">
                                        {calculateDiscount(product.mrp, product.price)}% OFF
                                    </div>
                                )}
                            </div>
                            <div className="product-details d-flex flex-column">
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
                                        onClick={(e) => handleAddToCart(product.product_id, e)}
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
            )}
        </div>
    );
};

export default Products; 