import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { getFeaturedProducts, addToCart } from '../api/products';
import { getUserProfile } from '../api/user';
import '../styles/Products.css';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get user profile
                const userId = localStorage.getItem('userId');
                if (userId) {
                    const profile = await getUserProfile(userId);
                    setUserProfile(profile);
                }

                // Get featured products
                const featuredProducts = await getFeaturedProducts();
                setProducts(featuredProducts);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddToCart = async (productId) => {
        try {
            if (!userProfile) {
                setError('Please login to add items to cart');
                return;
            }

            const userId = localStorage.getItem('userId');
            await addToCart(userId, productId, 1);
            setSuccess('Product added to cart successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const calculateDiscount = (price, mrp) => {
        return Math.round(((mrp - price) / mrp) * 100);
    };

    const getProductImage = (product) => {
        if (product.image_url) {
            // If the image_url is a full URL, use it directly
            if (product.image_url.startsWith('http')) {
                return product.image_url;
            }
            // Otherwise, prepend the API base URL
            return `http://localhost:8000${product.image_url}`;
        }
        // Fallback to category-based images
        const category = product.category?.toLowerCase() || 'default';
        return `http://localhost:8000/images/products/${category}.jpg`;
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

            {userProfile && (
                <div className="mb-4">
                    <h3>Welcome, {userProfile.full_name}!</h3>
                    <p>Your current balance: ₹{userProfile.accounts[0]?.balance || 0}</p>
                </div>
            )}

            <h2 className="mb-4">Featured Products</h2>
            <Row xs={1} md={2} lg={3} className="g-4">
                {products.map((product) => (
                    <Col key={product.product_id}>
                        <Card className="h-100 product-card">
                            <div className="product-image-container">
                                <Card.Img 
                                    variant="top" 
                                    src={getProductImage(product)} 
                                    alt={product.name}
                                    className="product-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `${process.env.REACT_APP_API_URL}/images/products/default.jpg`;
                                    }}
                                />
                            </div>
                            <Card.Body>
                                <Card.Title>{product.name}</Card.Title>
                                <Card.Text>{product.description}</Card.Text>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="mb-0">₹{product.price}</h5>
                                        <small className="text-muted text-decoration-line-through">
                                            ₹{product.mrp}
                                        </small>
                                        <Badge bg="success" className="ms-2">
                                            {calculateDiscount(product.price, product.mrp)}% OFF
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleAddToCart(product.product_id)}
                                        className="add-to-cart-btn"
                                    >
                                        Add to Cart
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default Products; 