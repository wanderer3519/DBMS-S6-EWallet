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
                const response = await axios.get(`http://localhost:8000/products/${productId}`);
                setProduct(response.data);
                setLoading(false);
            } catch (err) {
                setError('Error fetching product details');
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!product) return <div className="error">Product not found</div>;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
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
                        <span className="value">{product.business_category}</span>
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