import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Cart.css';

export const calculateTotal = (items) => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
};

export const handleAddToCart = async (productId, quantity = 1) => {
    const API_BASE_URL = 'http://localhost:8000';
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login to add items to cart');
        }

        const response = await axios.post(`${API_BASE_URL}/api/cart`, {
            product_id: productId,
            quantity: quantity
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.response?.status === 401) {
            throw new Error('Please login to add items to cart');
        } else if (error.response?.status === 404) {
            throw new Error('Product not found');
        } else if (error.response?.status === 400) {
            throw new Error(error.response.data.detail || 'Not enough stock available');
        } else {
            throw new Error('Failed to add item to cart. Please try again.');
        }
    }
};

const Cart = () => {
    const API_BASE_URL = 'http://localhost:8000';
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const navigate = useNavigate();

    const fetchCartItems = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/api/cart`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setCartItems(response.data.items || []);
            setTotal(response.data.total_amount || 0);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch cart items. Please try again later.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCartItems();
    }, []);

    const updateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/cart/product/${productId}`,
                { quantity: newQuantity },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            // Refresh cart after successful update
            fetchCartItems();
        } catch (err) {
            console.error('Error updating quantity:', err);
            console.error('Response data:', err.response?.data);
            setError(err.response?.data?.detail || 'Failed to update quantity. Please try again.');
        }
    };

    const removeItem = async (productId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/cart/product/${productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            fetchCartItems();
        } catch (err) {
            setError('Failed to remove item. Please try again.');
        }
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            setError('Your cart is empty. Please add items before checkout.');
            return;
        }
        console.log('Navigating to checkout page...');
        try {
            navigate('/checkout');
            console.log('Navigation called successfully');
        } catch (err) {
            console.error('Navigation error:', err);
        }
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    if (loading) {
        return <div className="loading">Loading your cart...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="cart-container">
            <div className="cart-header">
                <h1>Your Shopping Cart</h1>
                <button
                    className="back-to-dashboard"
                    onClick={handleBackToDashboard}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {cartItems.length === 0 ? (
                <div className="empty-cart">
                    <p>Your cart is empty</p>
                    <button
                        className="continue-shopping"
                        onClick={() => navigate('/dashboard')}
                    >
                        Continue Shopping
                    </button>
                </div>
            ) : (
                <div className="cart-layout">
                    <div className="cart-items-container">
                        <div className="cart-items">
                            {cartItems.map((item) => (
                                <div key={item.cart_item_id} className="cart-item">
                                    <div className="item-image">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} />
                                        ) : (
                                            <div className="placeholder-image">No image</div>
                                        )}
                                    </div>
                                    <div className="item-details">
                                        <h3>{item.name}</h3>
                                        <p className="item-category">{item.category}</p>
                                        <p className="item-price">₹{item.price}</p>
                                    </div>
                                    <div className="item-quantity">
                                        <button
                                            className="quantity-btn"
                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            -
                                        </button>
                                        <span className="quantity-value">{item.quantity}</span>
                                        <button
                                            className="quantity-btn"
                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="item-total">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                    </div>
                                    <button
                                        className="remove-item"
                                        onClick={() => removeItem(item.product_id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="cart-summary">
                        <h2>Order Summary</h2>
                        <div className="summary-row">
                            <span>Items ({cartItems.length})</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Delivery</span>
                            <span>Free</span>
                        </div>
                        <div className="summary-row total-amount">
                            <span>Total Amount</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <button
                            className="checkout-button"
                            onClick={handleCheckout}
                            disabled={cartItems.length === 0}
                        >
                            Proceed to Checkout
                        </button>
                        <button
                            className="continue-shopping"
                            onClick={() => navigate('/dashboard')}
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart; 