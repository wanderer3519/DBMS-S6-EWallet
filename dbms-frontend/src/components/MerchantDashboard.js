import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './MerchantDashboard.css';

const MerchantDashboard = ({ adminView }) => {
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
  const [dashboardSummary, setDashboardSummary] = useState({
    totalProducts: 0,
    totalCategories: 0,
    outOfStock: 0
  });
  const navigate = useNavigate();
  const { merchantId } = useParams(); // Get merchantId from URL parameter

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
    if (adminView && merchantId) {
      console.log(`Admin viewing merchant with ID: ${merchantId}`);
      fetchMerchantAsAdmin(merchantId);
      return;
    }
    
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
  }, [navigate, adminView, merchantId]);

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

  useEffect(() => {
    // Calculate dashboard summary when products change
    if (allProducts.length > 0) {
      const uniqueCategories = [...new Set(allProducts.map(p => p.business_category || 'Uncategorized'))];
      const outOfStock = allProducts.filter(p => p.stock === 0).length;
      
      setDashboardSummary({
        totalProducts: allProducts.length,
        totalCategories: uniqueCategories.length,
        outOfStock: outOfStock
      });
    }
  }, [allProducts]);

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
    // Get the most up-to-date product details if available
    const currentProduct = productDetails[product.product_id] || product;
    
    setSelectedProduct(product);
    setUpdateProduct({
      product_name: currentProduct.name || '',
      business_category: currentProduct.business_category || '',
      price: currentProduct.price ? currentProduct.price.toString() : '',
      mrp: currentProduct.mrp ? currentProduct.mrp.toString() : '',
      stock: currentProduct.stock ? currentProduct.stock.toString() : '',
      description: currentProduct.description || ''
    });
    
    // Scroll to the update form
    setTimeout(() => {
      const updateForm = document.querySelector('.update-product-form');
      if (updateForm) {
        updateForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    
    setShowUpdateForm(true);
  };

  // Simplify the refresh function to just fetch all products
  const refreshAllProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        navigate('/merchant/login');
        return;
      }
      
      setLoading(true);
      
      const res = await axios.get(`http://localhost:8000/api/merchant/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // Process products data
      const processedProducts = res.data.map(product => ({
        ...product,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || product.created_at || new Date().toISOString(),
        business_category: product.business_category || 'Uncategorized'
      }));

      // Sort by most recently updated
      const sortedProducts = processedProducts.sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      
      setAllProducts(sortedProducts);
      applyFilters(selectedCategory, searchTerm);
      
      // Extract categories
      const uniqueCategories = [...new Set(sortedProducts.map(product => 
        product.business_category || 'Uncategorized'
      ))].sort();
      
      setCategories(uniqueCategories);
      setLoading(false);
    } catch (err) {
      console.error('Error refreshing products:', err);
      setError('Failed to refresh products. ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  // Function to update a product in the local list and reset the form
  const updateProductInListAndReset = (updatedProduct) => {
    // Update the product in allProducts
    setAllProducts(prevProducts => 
      prevProducts.map(product => 
        product.product_id === updatedProduct.product_id ? 
          {...product, ...updatedProduct, updated_at: new Date().toISOString()} : 
          product
      )
    );
    
    // Update the product in products list based on current filters
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.product_id === updatedProduct.product_id ? 
          {...product, ...updatedProduct, updated_at: new Date().toISOString()} : 
          product
      )
    );
    
    // Reset the update form
    setUpdateProduct({
      product_name: '',
      business_category: '',
      price: '',
      mrp: '',
      stock: '',
      description: ''
    });
    
    // Update productDetails cache
    setProductDetails(prev => ({
      ...prev,
      [updatedProduct.product_id]: {
        ...prev[updatedProduct.product_id],
        ...updatedProduct
      }
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert("Please select a product to update first.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Check if all required fields are provided
      if (!updateProduct.product_name || !updateProduct.price || !updateProduct.mrp || !updateProduct.stock) {
        alert("Please fill in all required fields (Name, Price, MRP, and Stock)");
        return;
      }
      
      // Validate price and MRP
      if (parseFloat(updateProduct.price) > parseFloat(updateProduct.mrp)) {
        alert("Price cannot be greater than MRP");
        return;
      }
      
      // Create a JSON object for the update
      const updateData = {
        name: updateProduct.product_name,
        business_category: updateProduct.business_category,
        price: parseFloat(updateProduct.price),
        mrp: parseFloat(updateProduct.mrp),
        stock: parseInt(updateProduct.stock),
        description: updateProduct.description
      };
      
      console.log('Updating product with data:', updateData);
      
      setLoading(true); // Show loading state during update
      
      // Send the update request
      const response = await axios.put(
        `http://localhost:8000/api/merchant/products/${selectedProduct.product_id}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Update the local products array with the updated product
      const updatedProduct = response.data;
      updateProductInListAndReset(updatedProduct);
      
      // Hide the update form
      setShowUpdateForm(false);
      setLoading(false);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  // Function to handle product deletion
  const handleDeleteProduct = async (productId, productName) => {
    // Ask for confirmation before deleting
    if (!window.confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      setLoading(true);
      
      // Send delete request to the API
      await axios.delete(`http://localhost:8000/api/merchant/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Remove the product from the state
      setAllProducts(prevProducts => prevProducts.filter(product => product.product_id !== productId));
      setProducts(prevProducts => prevProducts.filter(product => product.product_id !== productId));
      
      // Update dashboard summary
      setDashboardSummary(prevSummary => ({
        ...prevSummary,
        totalProducts: prevSummary.totalProducts - 1
      }));
      
      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // If the deleted product was selected for updating, reset the form
      if (selectedProduct && selectedProduct.product_id === productId) {
        setSelectedProduct(null);
        setShowUpdateForm(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
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
      
      console.log('Fetching logs for user:', user);

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

  const toggleUpdateForm = () => {
    if (showUpdateForm) {
      // If we're closing the form, reset the selectedProduct
      setShowUpdateForm(false);
      setSelectedProduct(null);
    } else {
      setShowUpdateForm(true);
    }
  };

  // Add function to fetch merchant data as admin
  const fetchMerchantAsAdmin = async (merchantId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get merchant profile
      const profileResponse = await axios.get(`http://localhost:8000/api/admin/merchants`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const merchantData = profileResponse.data.find(m => m.merchant_id.toString() === merchantId);
      
      if (!merchantData) {
        setError("Merchant not found");
        setLoading(false);
        return;
      }
      
      setMerchantProfile(merchantData);
      setShowProfile(true);
      
      // Get merchant products
      const productsResponse = await axios.get(`http://localhost:8000/products?merchant_id=${merchantId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const productsData = productsResponse.data;
      setProducts(productsData);
      setAllProducts(productsData);
      
      // Extract categories
      const uniqueCategories = [...new Set(productsData.map(p => p.business_category || 'Uncategorized'))];
      
      // Calculate dashboard metrics
      setDashboardSummary({
        totalProducts: productsData.length,
        totalCategories: uniqueCategories.length,
        outOfStock: productsData.filter(p => p.stock === 0).length
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching merchant data as admin:', err);
      setError(err.response?.data?.detail || "Failed to load merchant data");
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="merchant-dashboard">
      <div className="dashboard-header d-flex justify-content-between align-items-center">
        <h2><i className="fas fa-store"></i> Merchant Dashboard</h2>
        <div className="header-actions">
          {adminView ? (
            <button className="btn btn-outline-primary" onClick={() => navigate('/admin')}>
              <i className="fas fa-arrow-left"></i> Back to Admin Dashboard
            </button>
          ) : (
            <>
              <button className="btn btn-outline-primary" onClick={() => navigate('/merchant/profile')}>
                <i className="fas fa-user"></i> Profile
              </button>
              <button className="btn btn-outline-secondary" onClick={handleLogsClick}>
                <i className="fas fa-history"></i> Activity Logs
              </button>
            </>
          )}
        </div>
      </div>

      {adminView && (
        <div className="admin-view-banner">
          <span className="admin-view-label">
            Admin View - Viewing Merchant #{merchantId}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}
      
      {/* Dashboard summary metrics */}
      <div className="dashboard-metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-box"></i>
          </div>
          <div className="metric-content">
            <h3>{dashboardSummary.totalProducts}</h3>
            <span>Total Products</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-tags"></i>
          </div>
          <div className="metric-content">
            <h3>{dashboardSummary.totalCategories}</h3>
            <span>Categories</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon stock-warning">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="metric-content">
            <h3>{dashboardSummary.outOfStock}</h3>
            <span>Out of Stock</span>
          </div>
        </div>
      </div>

      {showProfile && merchantProfile && (
        <div className="merchant-profile">
          <h3><i className="fas fa-user-circle"></i> Merchant Profile</h3>
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
              <i className="fas fa-edit"></i> Edit Profile
            </button>
          </div>
        </div>
      )}

      {showLogs && (
        <div className="merchant-logs">
          <h3><i className="fas fa-history"></i> Activity Timeline</h3>
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

      {/* Product management UI shouldn't be visible to admin */}
      {!adminView && (
        <div className="product-management">
          <div className="product-management-header">
            <h3>Product Management</h3>
            <button className="btn btn-success" onClick={toggleAddProductForm}>
              <i className="fas fa-plus"></i> Add New Product
            </button>
          </div>
          
          {/* Rest of product management UI */}
        </div>
      )}
      
      {/* Product listing should always be visible */}
      <div className="products-section">
        <div className="products-header">
          <h3>Your Products</h3>
          <div className="filters">
            <div className="category-filter">
              <select 
                value={selectedCategory} 
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="form-control"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="search-filter">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
              />
              <button 
                className="btn btn-outline-secondary"
                onClick={handleSearch}
              >
                <i className="fas fa-search"></i>
              </button>
              {searchTerm && (
                <button 
                  className="btn btn-outline-secondary reset-btn"
                  onClick={handleResetSearch}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Product grid */}
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <p>No products available. Add your first product!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => {
              // Use product details from cache if available, otherwise use the product from the list
              const productToDisplay = productDetails[product.product_id] ? 
                {...product, ...productDetails[product.product_id]} : 
                product;
                
              return (
                <div key={productToDisplay.product_id} className="product-card">
                  <div 
                    className="product-image"
                    onClick={() => navigate(`/product/${productToDisplay.product_id}`)}
                  >
                    {productToDisplay.image_url ? (
                      <img 
                        src={`http://localhost:8000${productToDisplay.image_url}`}
                        alt={productToDisplay.name}
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
                      <span className="category-tag">{productToDisplay.business_category || 'Uncategorized'}</span>
                      <span className="discount-tag">{calculateDiscount(productToDisplay.mrp, productToDisplay.price)}% OFF</span>
                    </div>
                  </div>
                  <div className="product-info">
                    <h4>{productToDisplay.name}</h4>
                    <div className="product-details">
                      <div className="price-info">
                        <span className="price">₹{productToDisplay.price}</span>
                        <span className="mrp">MRP: ₹{productToDisplay.mrp}</span>
                      </div>
                      <div className="stock-info">
                        <span className={`stock-badge ${productToDisplay.stock === 0 ? 'out-of-stock' : productToDisplay.stock < 10 ? 'low-stock' : 'in-stock'}`}>
                          {productToDisplay.stock === 0 ? 'Out of Stock' : productToDisplay.stock < 10 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClick(productToDisplay);
                        }}
                      >
                        <i className="fas fa-edit"></i> Update
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(productToDisplay.product_id, productToDisplay.name);
                        }}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;