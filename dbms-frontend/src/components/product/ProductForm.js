import { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';

const ProductForm = ({ product, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        mrp: product?.mrp || '',
        stock: product?.stock || '',
    });
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(product?.image_url || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formDataToSend = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                formDataToSend.append(key, value);
            });
            
            if (image) {
                formDataToSend.append('image', image);
            }

            await onSubmit(formDataToSend);
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mt-4">
            <Card.Body>
                <Form onSubmit={handleSubmit}>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Product Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Price</Form.Label>
                        <Form.Control
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            step="0.01"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>MRP</Form.Label>
                        <Form.Control
                            type="number"
                            name="mrp"
                            value={formData.mrp}
                            onChange={handleChange}
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
                            value={formData.stock}
                            onChange={handleChange}
                            required
                            min="0"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Product Image</Form.Label>
                        <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {previewUrl && (
                            <div className="mt-2">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                                />
                            </div>
                        )}
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Product'}
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default ProductForm; 