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

      // Process products to ensure timestamps
      const processedProducts = res.data.map(product => ({
        ...product,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || product.created_at || new Date().toISOString()
      }));

      const sortedProducts = processedProducts.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      
      const uniqueCategories = [...new Set(sortedProducts.map(product => product.business_category))];
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products. ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
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

  const handleUpdateClick = (productId) => {
    navigate(`/merchant/products/update/${productId}`);
  };

  const handleLogsClick = () => {
    navigate('/merchant/logs');
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

  const handleProductClick = (productId) => {
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
          <button className="btn btn-outline" onClick={() => setShowProfile(!showProfile)}>
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
              <p><strong>Category:</strong> {merchantProfile.business_category}</p>
              <p><strong>Contact:</strong> {merchantProfile.contact}</p>
              <p><strong>Address:</strong> {merchantProfile.address}</p>
              <p><strong>GST Number:</strong> {merchantProfile.gst_number}</p>
              <p><strong>Created At:</strong> {formatDate(merchantProfile.created_at)}</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/merchant/profile/edit')}>
              Edit Profile
            </button>
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

          <button className="add-product-btn" onClick={toggleAddProductForm}>
            <i className="fas fa-plus"></i> {showAddProductForm ? 'Cancel' : 'Add New Product'}
          </button>
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
              <select 
                name="business_category" 
                value={newProduct.business_category} 
                onChange={handleInputChange} 
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value="new">Add New Category</option>
              </select>
            </div>

            {newProduct.business_category === 'new' && (
              <div className="form-group">
                <label>New Category Name:</label>
                <input 
                  type="text" 
                  name="newCategory" 
                  onChange={(e) => setNewProduct(prev => ({...prev, business_category: e.target.value}))} 
                  required 
                />
              </div>
            )}

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

      <div className="products-section">
        <h3>Your Products</h3>
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <p>No products available. Add your first product!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div 
                key={product.product_id} 
                className="product-card"
                onClick={() => handleProductClick(product.product_id)}
              >
                <div className="product-image">
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
                    <span className="category-tag">{product.business_category}</span>
                    <span className="discount-tag">{calculateDiscount(product.mrp, product.price)}% OFF</span>
                  </div>
                </div>
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <p className="description">{product.description}</p>
                  <div className="price-info">
                    <span className="price">₹{product.price}</span>
                    <span className="mrp">MRP: ₹{product.mrp}</span>
                  </div>
                  <div className="product-meta">
                    <span className="stock">
                      <i className="fas fa-box"></i> {product.stock} in stock
                    </span>
                    <span className="dates">
                      <i className="fas fa-clock"></i> Updated: {formatDate(product.updated_at)}
                    </span>
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
