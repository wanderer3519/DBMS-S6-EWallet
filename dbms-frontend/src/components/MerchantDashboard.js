import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MerchantDashboard.css';

const MerchantDashboard = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [productDetails, setProductDetails] = useState({});
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    mrp: '',
    stock: '',
    business_category: '',
    image: null,
    isNewCategory: false
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateProduct, setUpdateProduct] = useState({
    product_name: '',
    business_category: '',
    price: '',
    mrp: '',
    stock: '',
    description: ''
  });
  const navigate = useNavigate();

  const styles = {
    updateProductForm: {
      marginTop: '20px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    selectedProductInfo: {
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      fontSize: '14px',
    },
    formText: {
      display: 'block',
      marginTop: '5px',
      fontSize: '12px',
      color: '#6c757d',
    },
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
    },
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const hasShownLoginMessage = localStorage.getItem('hasShownLoginMessage');
    
    if (!user || !token || user.role !== 'merchant') {
      navigate('/merchant/login');
      return;
    }
    
    fetchProducts();
    fetchMerchantProfile();
    
    if (!hasShownLoginMessage) {
      setSuccessMessage('Successfully logged in to the Merchant account.');
      localStorage.setItem('hasShownLoginMessage', 'true');
      const timer = setTimeout(() => setSuccessMessage(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  // New useEffect to fetch product details
  useEffect(() => {
    const fetchAllProductDetails = async () => {
      if (products.length > 0) {
        for (const product of products) {
          await fetchProductDetails(product.product_id);
        }
      }
    };

    fetchAllProductDetails();
  }, [products]);

  const fetchMerchantProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await axios.get(`http://localhost:8000/api/merchant/profile`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      setMerchantProfile(response.data);
    } catch (err) {
      console.error('Error fetching merchant profile:', err);
    }
  };

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

      // Process products and ensure all required fields
      const processedProducts = res.data.map(product => ({
        ...product,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || product.created_at || new Date().toISOString(),
        business_category: product.business_category || 'Uncategorized'
      }));

      const sortedProducts = processedProducts.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      
      // Extract and sort categories
      const uniqueCategories = [...new Set(sortedProducts.map(product => 
        product.business_category || 'Uncategorized'
      ))].sort();
      
      setCategories(uniqueCategories);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products. ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  // New function to fetch product details by ID
  const fetchProductDetails = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/merchant/login');
        return;
      }
      
      const res = await axios.get(`http://localhost:8000/api/products/${productId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      // Update the product details in the state
      setProductDetails(prev => ({
        ...prev,
        [productId]: res.data
      }));
      
      return res.data;
    } catch (err) {
      console.error(`Error fetching product details for ID ${productId}:`, err);
      return null;
    }
  };

  // Function to get product details (either from cache or fetch from API)
  const getProductDetails = async (productId) => {
    // If we already have the details, return them
    if (productDetails[productId]) {
      return productDetails[productId];
    }
    
    // Otherwise fetch them
    return await fetchProductDetails(productId);
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
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
      
      const newProductData = {
        ...response.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setAllProducts(prevProducts => [...prevProducts, newProductData]);
      
      if (!categories.includes(newProduct.business_category)) {
        setCategories(prev => [...prev, newProduct.business_category]);
      }
      
      setNewProduct({
        name: '',
        description: '',
        price: '',
        mrp: '',
        stock: '',
        business_category: '',
        image: null,
        isNewCategory: false
      });

      setSuccessMessage('Product added successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      setShowAddProductForm(false);
      
      applyFilters(selectedCategory, searchTerm);
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Failed to add product. ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleUpdateClick = (product) => {
    setSelectedProduct(product);
    setUpdateProduct({
      product_id: product.product_id,
      product_name: product.name,
      business_category: product.business_category,
      price: product.price,
      mrp: product.mrp,
      stock: product.stock,
      description: product.description
    });
    setShowUpdateForm(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert("Please select a product to update first.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add all form fields to the FormData object
      formData.append('name', updateProduct.product_name);
      formData.append('business_category', updateProduct.business_category);
      formData.append('price', updateProduct.price);
      formData.append('mrp', updateProduct.mrp);
      formData.append('stock', updateProduct.stock);
      formData.append('description', updateProduct.description);
      
      const response = await axios.put(
        `http://localhost:8000/api/merchant/products/${selectedProduct.product_id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.status === 200) {
        // Update the product in the local state
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.product_id === selectedProduct.product_id 
              ? { 
                  ...product, 
                  name: updateProduct.product_name,
                  business_category: updateProduct.business_category,
                  price: updateProduct.price,
                  mrp: updateProduct.mrp,
                  stock: updateProduct.stock,
                  description: updateProduct.description,
                  updated_at: new Date().toISOString() 
                } 
              : product
          )
        );
        
        setShowUpdateForm(false);
        setSelectedProduct(null);
        setUpdateProduct({
          product_name: '',
          business_category: '',
          price: '',
          mrp: '',
          stock: '',
          description: ''
        });
        setSuccessMessage('Product updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  // Add a new function to handle product ID input
  const handleProductIdInput = async (e) => {
    const productId = e.target.value;
    if (!productId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        setSelectedProduct(response.data);
        setUpdateProduct({
          product_name: response.data.name,
          business_category: response.data.business_category,
          price: response.data.price,
          mrp: response.data.mrp,
          stock: response.data.stock,
          description: response.data.description
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Product not found. Please check the ID and try again.');
    }
  };

  const fetchMerchantLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        navigate('/merchant/login');
        return;
      }
      
      const res = await axios.get(`http://localhost:8000/api/merchant/${user.user_id}/logs`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching merchant logs:', err);
      setError('Failed to fetch logs. ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleLogsClick = () => {
    setShowLogs(!showLogs);
    if (!showLogs) {
      fetchMerchantLogs();
    }
  };

  const handleSearch = () => {
    applyFilters(selectedCategory, searchTerm);
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    applyFilters(selectedCategory, '');
  };

  const toggleAddProductForm = () => {
    setShowAddProductForm(!showAddProductForm);
  };

  const handleProductClick = async (productId) => {
    // Fetch product details before navigating
    await getProductDetails(productId);
    navigate(`/product/${productId}`);
  };

  const calculateDiscount = (mrp, price) => {
    if (!mrp || !price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    applyFilters(category, searchTerm);
  };

  const applyFilters = (category, search) => {
    let filteredProducts = [...allProducts];
    
    if (category !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.business_category === category
      );
    }
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchLower) || 
        product.business_category.toLowerCase().includes(searchLower)
      );
    }
    
    setProducts(filteredProducts);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="merchant-dashboard">
      <div className="dashboard-header">
        <h2>Merchant Dashboard</h2>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/merchant/profile')}>
            <i className="fas fa-user"></i> Profile
          </button>
          <button className="btn btn-outline" onClick={handleLogsClick}>
            <i className="fas fa-history"></i> View Logs
          </button>
        </div>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}

      {showProfile && merchantProfile && (
        <div className="merchant-profile">
          <h3>Merchant Profile</h3>
          <div className="profile-content">
            <div className="profile-info">
              <p><strong>Business Name:</strong> {merchantProfile.business_name}</p>
              <p><strong>Business Category:</strong> {merchantProfile.business_category}</p>
              <p><strong>Contact:</strong> {merchantProfile.contact}</p>
              <p><strong>Email:</strong> {merchantProfile.email}</p>
              <p><strong>Created At:</strong> {formatDate(merchantProfile.created_at)}</p>
              <p><strong>Last Updated:</strong> {formatDate(merchantProfile.updated_at)}</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/merchant/profile/edit')}>
              Edit Profile
            </button>
          </div>
        </div>
      )}

      {showLogs && (
        <div className="merchant-logs">
          <h3>Activity Timeline</h3>
          <div className="timeline">
            {logs.length === 0 ? (
              <p className="no-logs">No activity logs found.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-date">{formatDate(log.timestamp)}</div>
                  <div className="timeline-content">
                    <h4>{log.action}</h4>
                    <p><strong>Product:</strong> {log.product_name}</p>
                    <p><strong>Category:</strong> {log.business_category}</p>
                    <p><strong>Price:</strong> ₹{log.price}</p>
                    <p><strong>Stock:</strong> {log.stock}</p>
                    <p><strong>Description:</strong> {log.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="search-section">
        <div className="search-row">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search by product name or category" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-btn">
              <i className="fas fa-search"></i> Search
            </button>
            <button onClick={handleResetSearch} className="reset-btn">
              Reset
            </button>
          </div>

          <div className="action-buttons">
            <button className="add-product-btn" onClick={toggleAddProductForm}>
              <i className="fas fa-plus"></i> {showAddProductForm ? 'Cancel' : 'Add New Product'}
            </button>
            <button className="update-product-btn" onClick={() => setShowUpdateForm(!showUpdateForm)}>
              <i className="fas fa-edit"></i> {showUpdateForm ? 'Cancel' : 'Update a Product'}
            </button>
          </div>
        </div>

        <div className="category-filter">
          <button 
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategorySelect('all')}
          >
            All Products
          </button>
          {categories.map(category => (
            <button 
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {showAddProductForm && (
        <div className="add-product-form">
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

            <div className="form-row">
              <div className="form-group">
                <label>Price (₹):</label>
                <input type="number" name="price" value={newProduct.price} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>MRP (₹):</label>
                <input type="number" name="mrp" value={newProduct.mrp} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Stock:</label>
                <input type="number" name="stock" value={newProduct.stock} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Business Category:</label>
              <input 
                type="text" 
                name="business_category" 
                value={newProduct.business_category}
                onChange={handleInputChange}
                placeholder="Enter category name"
                required 
              />
            </div>

            <div className="form-group">
              <label>Product Image:</label>
              <input type="file" accept="image/*" onChange={handleImageChange} required />
            </div>

            <div className="form-buttons">
              <button 
                type="submit" 
                className="btn btn-success" 
                disabled={isAddingProduct}
              >
                {isAddingProduct ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showUpdateForm && (
        <div className="update-product-form" style={styles.updateProductForm}>
          <h3>Update Product</h3>
          <p className="selected-product-info" style={styles.selectedProductInfo}>
            Updating product: <strong>{selectedProduct.name}</strong> (ID: {selectedProduct.product_id})
          </p>
          <form onSubmit={handleUpdateSubmit}>
            <div className="form-group">
              <label>Product Name:</label>
              <input
                type="text"
                name="product_name"
                value={updateProduct.product_name}
                onChange={(e) => setUpdateProduct({...updateProduct, product_name: e.target.value})}
                placeholder="Enter product name"
              />
              <small className="form-text" style={styles.formText}>Current value: {selectedProduct.name}</small>
            </div>
            <div className="form-group">
              <label>Business Category:</label>
              <input
                type="text"
                name="business_category"
                value={updateProduct.business_category}
                onChange={(e) => setUpdateProduct({...updateProduct, business_category: e.target.value})}
                placeholder="Enter business category"
              />
              <small className="form-text" style={styles.formText}>Current value: {selectedProduct.business_category}</small>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price:</label>
                <input
                  type="number"
                  name="price"
                  value={updateProduct.price}
                  onChange={(e) => setUpdateProduct({...updateProduct, price: e.target.value})}
                  placeholder="Enter price"
                />
                <small className="form-text" style={styles.formText}>Current value: {selectedProduct.price}</small>
              </div>
              <div className="form-group">
                <label>MRP:</label>
                <input
                  type="number"
                  name="mrp"
                  value={updateProduct.mrp}
                  onChange={(e) => setUpdateProduct({...updateProduct, mrp: e.target.value})}
                  placeholder="Enter MRP"
                />
                <small className="form-text" style={styles.formText}>Current value: {selectedProduct.mrp}</small>
              </div>
            </div>
            <div className="form-group">
              <label>Stock:</label>
              <input
                type="number"
                name="stock"
                value={updateProduct.stock}
                onChange={(e) => setUpdateProduct({...updateProduct, stock: e.target.value})}
                placeholder="Enter stock"
              />
              <small className="form-text" style={styles.formText}>Current value: {selectedProduct.stock}</small>
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                name="description"
                value={updateProduct.description}
                onChange={(e) => setUpdateProduct({...updateProduct, description: e.target.value})}
                placeholder="Enter description"
              />
              <small className="form-text" style={styles.formText}>Current value: {selectedProduct.description}</small>
            </div>
            <div className="form-actions" style={styles.formActions}>
              <button type="submit" className="btn btn-primary">Update Product</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="products-section">
        <h3>My Products</h3>
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <p>No products available. Add your first product!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.product_id} className="product-card">
                <div 
                  className="product-image"
                  onClick={() => navigate(`/product/${product.product_id}`)}
                >
                  {product.image_url ? (
                    <img 
                      src={`http://localhost:8000${product.image_url}`}
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.png';
                      }}
                    />
                  ) : (
                    <div className="placeholder-image">
                      <i className="fas fa-image"></i>
                      <span>No Image</span>
                    </div>
                  )}
                  <div className="product-overlay">
                    <span className="category-tag">{product.business_category || 'Uncategorized'}</span>
                    <span className="discount-tag">{calculateDiscount(product.mrp, product.price)}% OFF</span>
                  </div>
                </div>
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <div className="price-info">
                    <span className="price">₹{product.price}</span>
                    <span className="mrp">MRP: ₹{product.mrp}</span>
                  </div>
                  <div className="product-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateClick(product);
                      }}
                    >
                      Update
                    </button>
                  </div>
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
