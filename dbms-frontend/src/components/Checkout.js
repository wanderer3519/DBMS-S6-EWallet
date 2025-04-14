import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchCartItems();
    }, []);

    const fetchCartItems = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/api/cart', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (response.data.items && response.data.items.length > 0) {
                setCartItems(response.data.items);
                setTotal(response.data.total_amount);
            } else {
                setError('Your cart is empty. Please add items before checkout.');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching cart items:', err);
            setError('Failed to load cart items. Please try again.');
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:8000/api/checkout', {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (response.data && response.data.order_id) {
                navigate(`/order-confirmation/${response.data.order_id}`);
            } else {
                setError('Failed to process checkout. Please try again.');
                setProcessing(false);
            }
        } catch (err) {
            console.error('Error during checkout:', err);
            setError(err.response?.data?.detail || 'Failed to process checkout. Please try again.');
            setProcessing(false);
        }
    };

    if (loading) return <div className="checkout-loading">Loading your cart...</div>;
    if (error) return <div className="checkout-error">{error}</div>;

    return (
        <div className="checkout-container">
            <h1>Checkout</h1>
            <div className="checkout-content">
                <div className="order-summary">
                    <h2>Order Summary</h2>
                    {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                            <div key={item.cart_item_id} className="checkout-item">
                                <img 
                                    src={item.image_url || 'https://via.placeholder.com/100'} 
                                    alt={item.name} 
                                    className="checkout-item-image" 
                                />
                                <div className="checkout-item-details">
                                    <h3>{item.name}</h3>
                                    <p>Quantity: {item.quantity}</p>
                                    <p>Price: ₹{item.price}</p>
                                    <p>Subtotal: ₹{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No items in your cart</p>
                    )}
                </div>
                <div className="checkout-summary">
                    <h2>Total Amount</h2>
                    <p className="total-amount">₹{total.toFixed(2)}</p>
                    <button 
                        className="checkout-button"
                        onClick={handleCheckout}
                        disabled={processing || cartItems.length === 0}
                    >
                        {processing ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout; 