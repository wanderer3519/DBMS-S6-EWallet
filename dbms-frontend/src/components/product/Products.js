import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Products.css';
import Page from '../shared/Page';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [categoryCounts, setCategoryCounts] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

    const API_BASE_URL = 'http://localhost:8000';

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/product`);
            
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
            // Build counts per category
            const counts = processedProducts.reduce((acc, p) => {
                const cat = p.business_category || 'Uncategorized';
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
            }, {});
            setCategoryCounts(counts);
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

            const _response = await axios.post(
                `${API_BASE_URL}/api/cart`,
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
        navigate(`/products/${productId}`);
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

    return (
        <Page 
            title="Product Catalog" 
            subtitle="Browse our selection and add items to your cart"
            icon="fas fa-store"
            breadcrumbs={[
                { label: 'Home', path: '/dashboard', icon: 'fas fa-home' },
                { label: 'Products' }
            ]}
            stats={[
                { 
                    icon: '📦', 
                    value: allProducts.length, 
                    label: 'Total Products' 
                },
                { 
                    icon: '🏷️', 
                    value: categories.length, 
                    label: 'Categories' 
                },
                { 
                    icon: '🛍️', 
                    value: products.length, 
                    label: 'Showing' 
                }
            ]}
        >
            <div className="products-container">

            <div className="products-toolbar">
                <div className="products-actions">
                    <input
                        type="text"
                        className="form-control"
                        style={{ minWidth: 260 }}
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-primary" onClick={handleSearch}>Search</button>
                    <button className="btn btn-outline-secondary" onClick={handleResetSearch}>Reset</button>
                </div>

                <div className="products-actions">
                    <button 
                        className={`chip ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => handleCategorySelect('all')}
                    >
                        All Products <span className="count">{allProducts.length}</span>
                    </button>
                    {categories.map(category => (
                        <button 
                            key={category}
                            className={`chip ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => handleCategorySelect(category)}
                        >
                            {category} <span className="count">{categoryCounts[category] || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {loading ? (
                <div className="products-grid">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="product-card skeleton-card">
                            <div className="skeleton-image" />
                            <div className="p-3">
                                <div className="skeleton-line w-75 mb-2" />
                                <div className="skeleton-line w-50 mb-3" />
                                <div className="skeleton-line w-25" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
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
        </Page>
    );
};

export default Products; 