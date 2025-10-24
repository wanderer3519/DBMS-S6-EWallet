import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Page from '../shared/Page';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import './ProductDetails.css';

const ProductDetails = () => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { productId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        fetchProductDetails();
    }, [productId]);

    const fetchProductDetails = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/product/${productId}`);
            setProduct(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching product details:', error);
            setError('Failed to load product details. Please try again.');
            setLoading(false);
        }
    };

    const handleQuantityChange = (change) => {
        const newQuantity = Math.max(1, Math.min(product.stock, quantity + change));
        setQuantity(newQuantity);
    };

    const handleAddToCartClick = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            setAdding(true);
            await axios.post(`${API_BASE_URL}/api/cart/add`, {
                product_id: product.product_id,
                quantity: quantity
            });
            setSuccessMessage('✅ Product added to cart successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error adding to cart:', error);
            setError('Failed to add product to cart. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    if (loading) return (
        <Page title="Loading..." icon="fas fa-spinner fa-spin" backButton={{ path: '/', label: 'Back to Products' }}>
            <LoadingSkeleton height="400px" />
        </Page>
    );
    
    if (error || !product) return (
        <Page title="Error" icon="fas fa-exclamation-triangle" backButton={{ path: '/', label: 'Back to Products' }}>
            <div className="alert alert-danger">{error || 'Product not found'}</div>
        </Page>
    );

    const discount = product.mrp > product.price 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
        : 0;

    return (
        <Page
            title={product.name}
            subtitle={product.business_category}
            icon="fas fa-box-open"
            breadcrumbs={[
                { name: 'Home', path: '/' },
                { name: 'Products', path: '/' },
                { name: product.name }
            ]}
            backButton={{ path: '/', label: 'Back to Products' }}
        >
            {successMessage && (
                <div className="alert alert-success mb-3 fade-in">
                    {successMessage}
                </div>
            )}

            <div className="product-details-container">
                <div className="product-image-section">
                    <div className="product-image-wrapper">
                        {discount > 0 && (
                            <span className="discount-badge">{discount}% OFF</span>
                        )}
                        <img
                            src={`${API_BASE_URL}${product.image_url}`}
                            alt={product.name}
                            className="product-detail-image"
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                            }}
                        />
                    </div>
                </div>

                <div className="product-info-section">
                    <div className="section-card">
                        <h2 className="product-title">{product.name}</h2>
                        <p className="product-category">
                            <i className="fas fa-tag me-2"></i>
                            {product.business_category}
                        </p>

                        <div className="price-section">
                            <div className="price-main">${product.price.toFixed(2)}</div>
                            {product.mrp > product.price && (
                                <>
                                    <div className="price-original">${product.mrp.toFixed(2)}</div>
                                    <div className="price-savings">
                                        Save ${(product.mrp - product.price).toFixed(2)}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="stock-status">
                            {product.stock > 0 ? (
                                <span className="badge bg-success">
                                    <i className="fas fa-check-circle me-1"></i>
                                    In Stock ({product.stock} available)
                                </span>
                            ) : (
                                <span className="badge bg-danger">
                                    <i className="fas fa-times-circle me-1"></i>
                                    Out of Stock
                                </span>
                            )}
                        </div>

                        <div className="product-description">
                            <h4>Description</h4>
                            <p>{product.description}</p>
                        </div>

                        {product.stock > 0 && (
                            <div className="purchase-section">
                                <div className="quantity-selector">
                                    <label>Quantity:</label>
                                    <div className="quantity-controls">
                                        <button
                                            className="btn-quantity"
                                            onClick={() => handleQuantityChange(-1)}
                                            disabled={quantity <= 1}
                                        >
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        <span className="quantity-value">{quantity}</span>
                                        <button
                                            className="btn-quantity"
                                            onClick={() => handleQuantityChange(1)}
                                            disabled={quantity >= product.stock}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className="btn-add-to-cart"
                                    onClick={handleAddToCartClick}
                                    disabled={adding}
                                >
                                    {adding ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-shopping-cart me-2"></i>
                                            Add to Cart
                                        </>
                                    )}
                                </button>

                                <div className="total-price">
                                    <span>Total: ${(product.price * quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default ProductDetails; 