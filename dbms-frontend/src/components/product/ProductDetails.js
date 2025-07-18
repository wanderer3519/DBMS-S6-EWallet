import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { handleAddToCart } from '../cart/Cart';
import './ProductDetails.css';

const ProductDetails = () => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const { productId } = useParams();
    const navigate = useNavigate();

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
        try {
            await handleAddToCart(productId, quantity);
            alert('Product added to cart successfully!');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Failed to add item to cart. Please try again.');
        }
    };

    if (loading) return <div className="loading">Loading product details...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!product) return <div className="error">Product not found</div>;

    return (
        <div className="product-details-container">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
                ← Back to Products
            </button>
            
            <div className="product-details-content">
                <div className="product-image-section">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="product-image" />
                    ) : (
                        <div className="placeholder-image">No Image Available</div>
                    )}
                </div>
                
                <div className="product-info-section">
                    <h1>{product.name}</h1>
                    <div className="product-category">
                        Category: {product.business_category}
                    </div>
                    
                    <div className="product-pricing">
                        <div className="current-price">₹{product.price}</div>
                        {product.mrp > product.price && (
                            <div className="original-price">MRP: ₹{product.mrp}</div>
                        )}
                    </div>
                    
                    <div className="product-stock">
                        Stock Available: {product.stock} units
                    </div>
                    
                    <div className="product-description">
                        <h3>Description</h3>
                        <p>{product.description}</p>
                    </div>
                    
                    <div className="product-actions">
                        <div className="quantity-controls">
                            <button 
                                onClick={() => handleQuantityChange(-1)}
                                disabled={quantity <= 1}
                            >
                                -
                            </button>
                            <span>{quantity}</span>
                            <button 
                                onClick={() => handleQuantityChange(1)}
                                disabled={quantity >= product.stock}
                            >
                                +
                            </button>
                        </div>
                        
                        <button 
                            className="add-to-cart-btn"
                            onClick={handleAddToCartClick}
                            disabled={product.stock === 0}
                        >
                            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails; 