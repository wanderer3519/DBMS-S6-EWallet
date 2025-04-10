import React, { useState, useEffect, useCallback } from 'react';
import { Container, Form, Button, Table, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm';

const MerchantDashboard = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const [showProductForm, setShowProductForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        mrp: '',
        stock: '',
        image_url: ''
    });

    const fetchProducts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || user.role !== 'merchant') {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/products/merchant', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:8000/products/', 
                newProduct,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setSuccess('Product added successfully!');
            setNewProduct({
                name: '',
                description: '',
                price: '',
                mrp: '',
                stock: '',
                image_url: ''
            });
            fetchProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            setError(error.response?.data?.detail || 'Error adding product');
        }
    };

    const handleCreateProduct = async (formData) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/merchant/products`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setProducts([...products, response.data]);
            setShowProductForm(false);
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    };

    const handleUpdateProduct = async (productId, formData) => {
        try {
            const response = await axios.put(
                `${process.env.REACT_APP_API_URL}/api/merchant/products/${productId}`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setProducts(products.map(p => 
                p.product_id === productId ? response.data : p
            ));
            setShowProductForm(false);
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Container className="py-4">
            <h2 className="mb-4">Merchant Dashboard</h2>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <div className="mb-5">
                <h3>Add New Product</h3>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Product Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={newProduct.name}
                            onChange={handleInputChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="description"
                            value={newProduct.description}
                            onChange={handleInputChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Price (₹)</Form.Label>
                        <Form.Control
                            type="number"
                            name="price"
                            value={newProduct.price}
                            onChange={handleInputChange}
                            required
                            min="0"
                            step="0.01"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>MRP (₹)</Form.Label>
                        <Form.Control
                            type="number"
                            name="mrp"
                            value={newProduct.mrp}
                            onChange={handleInputChange}
                            required
                            min="0"
                            step="0.01"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Stock</Form.Label>
                        <Form.Control
                            type="number"
                            name="stock"
                            value={newProduct.stock}
                            onChange={handleInputChange}
                            required
                            min="0"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Image URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="image_url"
                            value={newProduct.image_url}
                            onChange={handleInputChange}
                            required
                        />
                    </Form.Group>

                    <Button variant="primary" type="submit">
                        Add Product
                    </Button>
                </Form>
            </div>

            <div>
                <h3>Your Products</h3>
                <Table responsive>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Price</th>
                            <th>MRP</th>
                            <th>Stock</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.product_id}>
                                <td>{product.name}</td>
                                <td>₹{product.price}</td>
                                <td>₹{product.mrp}</td>
                                <td>{product.stock}</td>
                                <td>{product.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {showProductForm && (
                <ProductForm
                    product={selectedProduct}
                    onSubmit={selectedProduct ? 
                        (formData) => handleUpdateProduct(selectedProduct.product_id, formData) :
                        handleCreateProduct
                    }
                    onCancel={() => {
                        setShowProductForm(false);
                        setSelectedProduct(null);
                    }}
                />
            )}
        </Container>
    );
};

export default MerchantDashboard; 