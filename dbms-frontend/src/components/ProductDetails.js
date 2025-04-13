import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductDetails.css';

const ProductDetails = () => {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { productId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    navigate('/login');
                    return;
                }
                
                const response = await axios.get(`http://localhost:8000/api/products/${productId}`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                });
                
                setProduct(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching product details:', err);
                setError('Error fetching product details: ' + (err.response?.data?.detail || err.message));
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId, navigate]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!product) return <div className="error">Product not found</div>;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // If less than 24 hours ago, show relative time
            if (diffDays === 0) {
                const hours = Math.floor(diffTime / (1000 * 60 * 60));
                if (hours === 0) {
                    const minutes = Math.floor(diffTime / (1000 * 60));
                    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
                }
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            }
            
            // If less than 7 days ago, show days ago
            if (diffDays < 7) {
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            }
            
            // Otherwise show full date
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    };

    return (
        <div className="product-details-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                ← Back to Dashboard
            </button>
            
            <div className="product-details">
                <div className="product-image-container">
                    <img 
                        src={product.image_url || 'https://via.placeholder.com/300'} 
                        alt={product.name}
                        className="product-image"
                    />
                </div>
                
                <div className="product-info">
                    <div className="product-id-info">
                        <span className="label">Product ID:</span>
                        <span className="value">{product.product_id || product.id || 'N/A'}</span>
                    </div>

                    <h1>{product.name}</h1>

                    <p className="description">{product.description}</p>
                    
                    <div className="price-info">
                        <div className="price">
                            <span className="label">Price:</span>
                            <span className="value">₹{product.price}</span>
                        </div>
                        <div className="mrp">
                            <span className="label">MRP:</span>
                            <span className="value">₹{product.mrp}</span>
                        </div>
                    </div>

                    <div className="stock-info">
                        <span className="label">Stock:</span>
                        <span className="value">{product.stock} units</span>
                    </div>

                    <div className="category-info">
                        <span className="label">Category:</span>
                        <span className="value category-tag">{product.business_category || 'Uncategorized'}</span>
                    </div>

                    <div className="dates-info">
                        <div className="created-at">
                            <span className="label">Created:</span>
                            <span className="value">{formatDate(product.created_at)}</span>
                        </div>
                        <div className="updated-at">
                            <span className="label">Last Updated:</span>
                            <span className="value">{formatDate(product.updated_at)}</span>
                        </div>
                    </div>

                    <div className="status-info">
                        <span className="label">Status:</span>
                        <span className={`value status-${product.status}`}>
                            {product.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails; 