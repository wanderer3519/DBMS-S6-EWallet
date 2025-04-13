import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getUserProfile } from '../api/user';
import '../styles/Cart.css';

const Cart = () => {
    const [cartItems, setCartItems] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = localStorage.getItem('userId');
                if (!userId) {
                    navigate('/login');
                    return;
                }

                const profile = await getUserProfile(userId);
                setUserProfile(profile);

                // Fetch cart items
                const response = await fetch(`http://127.0.0.1:8000/cart/${userId}`);
                const data = await response.json();
                setCartItems(data.items);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const handleCheckout = async () => {
        try {
            if (!userProfile) {
                setError('Please login to checkout');
                return;
            }

            const total = calculateTotal();
            const balance = userProfile.accounts[0]?.balance || 0;

            if (balance < total) {
                setError(`Insufficient balance. Required: ₹${total}, Available: ₹${balance}`);
                return;
            }

            // Proceed with checkout
            const response = await fetch('http://127.0.0.1:8000/orders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    account_id: userProfile.accounts[0].account_id,
                    user_id: userProfile.user_id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to place order');
            }

            setSuccess('Order placed successfully!');
            setTimeout(() => {
                navigate('/orders');
            }, 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRemoveItem = async (productId) => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://127.0.0.1:8000/cart/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: productId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to remove item');
            }

            setCartItems(cartItems.filter(item => item.product_id !== productId));
            setSuccess('Item removed from cart');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <h2 className="mb-4">Shopping Cart</h2>
            
            {userProfile && (
                <div className="mb-4">
                    <h4>Account Balance: ₹{userProfile.accounts[0]?.balance || 0}</h4>
                </div>
            )}

            {cartItems.length === 0 ? (
                <Card>
                    <Card.Body className="text-center">
                        <h4>Your cart is empty</h4>
                        <Button variant="primary" onClick={() => navigate('/products')}>
                            Continue Shopping
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <>
                    <Table responsive>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Total</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems.map((item) => (
                                <tr key={item.product_id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="cart-item-image"
                                            />
                                            <span className="ms-3">{item.name}</span>
                                        </div>
                                    </td>
                                    <td>₹{item.price}</td>
                                    <td>{item.quantity}</td>
                                    <td>₹{item.price * item.quantity}</td>
                                    <td>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleRemoveItem(item.product_id)}
                                        >
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <Card className="mt-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <h4>Total: ₹{calculateTotal()}</h4>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleCheckout}
                                    disabled={!userProfile}
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    );
};

export default Cart; 