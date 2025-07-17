import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MerchantProfile.css';

const MerchantProfile = () => {
  const [merchantData, setMerchantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeListings: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: '',
    business_category: '',
    contact: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMerchantProfile();
  }, []);

  const fetchMerchantProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/merchant/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMerchantData(response.data);
      setEditForm({
        business_name: response.data.business_name,
        business_category: response.data.business_category,
        contact: response.data.contact || ''
      });
      await fetchMerchantStats();
      setLoading(false);
    } catch (err) {
      console.error('Error fetching merchant profile:', err);
      setError('Failed to load merchant profile. ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  const fetchMerchantStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/merchant/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setStats(response.data);
    } catch (err) {
      console.error('Error fetching merchant stats:', err);
    }
  };

  const fetchMerchantLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/merchant/${merchantData.merchant_id}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setLogs(response.data);
      setShowLogs(true);
    } catch (err) {
      console.error('Error fetching merchant logs:', err);
      setError('Failed to load logs. ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Only append fields that have changed
      if (editForm.business_name !== merchantData.business_name) {
        formData.append('business_name', editForm.business_name);
      }
      if (editForm.business_category !== merchantData.business_category) {
        formData.append('business_category', editForm.business_category);
      }
      if (editForm.contact !== merchantData.contact) {
        formData.append('contact', editForm.contact);
      }

      const response = await axios.put('http://localhost:8000/api/merchant/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMerchantData(response.data);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. ' + (err.response?.data?.detail || err.message));
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!merchantData) return <div className="error">No merchant data found</div>;

  return (
    <div className="merchant-profile-container">
      <div className="profile-header">
        <div className="header-content">
          <h1>{merchantData.business_name}</h1>
          <p className="business-category">{merchantData.business_category}</p>
        </div>
        <div className="header-actions">
          {!isEditing && (
            <>
              <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
              <button className="logs-btn" onClick={fetchMerchantLogs}>
                View Activity Logs
              </button>
            </>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p className="stat-value">{stats.totalProducts}</p>
        </div>
        <div className="stat-card">
          <h3>Active Listings</h3>
          <p className="stat-value">{stats.activeListings}</p>
        </div>
      </div>

      {showLogs ? (
        <div className="logs-section">
          <div className="logs-header">
            <h2>Product Activity Logs</h2>
            <button className="close-logs-btn" onClick={() => setShowLogs(false)}>×</button>
          </div>
          <div className="logs-list">
            {logs.length === 0 ? (
              <p className="no-logs">No activity logs found</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-item">
                  <div className="log-header">
                    <span className="log-action">{log.action}</span>
                    <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                  </div>
                  <div className="log-details">
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
      ) : (
        <>
          {isEditing ? (
            <div className="edit-profile-form">
              <h2>Edit Profile</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={editForm.business_name}
                    onChange={(e) => setEditForm({...editForm, business_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Business Category</label>
                  <input
                    type="text"
                    value={editForm.business_category}
                    onChange={(e) => setEditForm({...editForm, business_category: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Changes</button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="profile-details">
              <div className="details-section">
                <h2>Business Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Business Name</label>
                    <p>{merchantData.business_name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Business Category</label>
                    <p>{merchantData.business_category}</p>
                  </div>
                  <div className="detail-item">
                    <label>Merchant ID</label>
                    <p>{merchantData.merchant_id}</p>
                  </div>
                  <div className="detail-item">
                    <label>Member Since</label>
                    <p>{formatDate(merchantData.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h2>Contact Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Full Name</label>
                    <p>{merchantData.name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{merchantData.email}</p>
                  </div>
                  <div className="detail-item">
                    <label>Contact Number</label>
                    <p>{merchantData.contact || 'Not provided'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Last Updated</label>
                    <p>{formatDate(merchantData.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MerchantProfile; 