import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MerchantDashboard.css';

const MerchantDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    mrp: '',
    stock: '',
    business_category: '',
    image: null,
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in and is a merchant
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!user || !token || user.role !== 'merchant') {
      navigate('/merchant/login');
      return;
    }
    
    fetchProducts();
    setSuccessMessage('Successfully logged in to the Merchant account.');
    const timer = setTimeout(() => setSuccessMessage(''), 10000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        navigate('/merchant/login');
        return;
      }
      
      const res = await axios.get(`http://localhost:8000/api/merchant/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // Sort products by most recently updated
      const sortedProducts = res.data.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      
      setProducts(sortedProducts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products. ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setNewProduct(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAddingProduct(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/merchant/login');
        return;
      }

      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description', newProduct.description);
      formData.append('price', newProduct.price);
      formData.append('mrp', newProduct.mrp);
      formData.append('stock', newProduct.stock);
      formData.append('business_category', newProduct.business_category);
      formData.append('image', newProduct.image);

      const response = await axios.post('http://localhost:8000/api/merchant/products', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Add the new product to the state directly
      setProducts(prevProducts => [...prevProducts, response.data]);
      
      // Reset form
      setNewProduct({
        name: '',
        description: '',
        price: '',
        mrp: '',
        stock: '',
        business_category: '',
        image: null,
      });

      // Show success message
      setSuccessMessage('Product added successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Hide the form
      setShowAddProductForm(false);
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Failed to add product. ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleUpdateClick = (productId) => {
    navigate(`/merchant/products/update/${productId}`);
  };

  const handleLogsClick = () => {
    navigate('/merchant/logs');
  };

  const handleSearchByName = () => {
    if (searchTerm.trim()) {
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProducts(filteredProducts);
    } else {
      fetchProducts();
    }
  };

  const handleSearchByCategory = () => {
    if (searchCategory.trim()) {
      const filteredProducts = products.filter(product => 
        product.business_category.toLowerCase().includes(searchCategory.toLowerCase())
      );
      setProducts(filteredProducts);
    } else {
      fetchProducts();
    }
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    setSearchCategory('');
    fetchProducts();
  };

  const toggleAddProductForm = () => {
    setShowAddProductForm(!showAddProductForm);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="merchant-dashboard">
      <h2>Merchant Dashboard</h2>
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn" onClick={handleLogsClick}>
          View Logs
        </button>
        <button className="action-btn" onClick={toggleAddProductForm}>
          {showAddProductForm ? 'Cancel Adding Product' : 'Add New Product'}
        </button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-by-name">
          <input 
            type="text" 
            placeholder="Search by product name" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearchByName}>Search</button>
        </div>
        
        <div className="search-by-category">
          <input 
            type="text" 
            placeholder="Search by category" 
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          />
          <button onClick={handleSearchByCategory}>Search</button>
        </div>
        
        <button className="reset-btn" onClick={handleResetSearch}>
          Reset Search
        </button>
      </div>

      {/* Add Product Form */}
      {showAddProductForm && (
        <div className="product-form-container">
          <h3>Add New Product</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Product Name:</label>
              <input name="name" value={newProduct.name} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Description:</label>
              <textarea name="description" value={newProduct.description} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Price:</label>
              <input type="number" name="price" value={newProduct.price} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>MRP:</label>
              <input type="number" name="mrp" value={newProduct.mrp} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Stock:</label>
              <input type="number" name="stock" value={newProduct.stock} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Business Category:</label>
              <input name="business_category" value={newProduct.business_category} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Product Image:</label>
              <input type="file" accept="image/*" onChange={handleImageChange} required />
            </div>

            <div className="form-buttons">
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={isAddingProduct}
              >
                {isAddingProduct ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Section */}
      <div className="products-section">
        <h3>Your Products</h3>
        {products.length === 0 ? (
          <p className="no-products-message">No products available. Add your first product!</p>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.product_id} className="product-card">
                <div className="product-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <div className="placeholder-image">{product.name}</div>
                  )}
                </div>
                <div className="product-details">
                  <h4>{product.name}</h4>
                  <p>{product.description}</p>
                  <p><strong>Price:</strong> ₹{product.price}</p>
                  <p><strong>MRP:</strong> ₹{product.mrp}</p>
                  <p><strong>Stock:</strong> {product.stock}</p>
                  <p><strong>Category:</strong> {product.business_category}</p>
                  <div className="product-timestamps">
                    <p><strong>Created:</strong> {formatDate(product.created_at)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(product.updated_at)}</p>
                  </div>
                </div>
                <div className="product-actions">
                  <button 
                    className="update-btn"
                    onClick={() => handleUpdateClick(product.product_id)}
                  >
                    Update Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;
