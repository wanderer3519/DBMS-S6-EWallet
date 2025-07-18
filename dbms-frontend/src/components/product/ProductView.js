import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';

const ProductView = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { productId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:8000/api/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setProduct(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product details. Please try again.');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      if (!token || !user) {
        navigate('/login');
        return;
      }

      await axios.post('http://localhost:8000/api/cart/add', {
        product_id: product.product_id,
        quantity: 1
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!product) return <div className="error">Product not found</div>;

  return (
    <div className="product-view-container">
      <div className="product-view-content">
        <div className="product-image-section">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="product-view-image" />
          ) : (
            <div className="placeholder-image">No Image Available</div>
          )}
        </div>
        <div className="product-details-section">
          <h1>{product.name}</h1>
          <p className="product-category">Category: {product.business_category}</p>
          <div className="price-section">
            <span className="current-price">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="mrp-price">MRP: ₹{product.mrp}</span>
            )}
          </div>
          <p className="stock-info">Stock: {product.stock} units</p>
          <div className="description-section">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
          <button 
            className="add-to-cart-btn"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductView; 