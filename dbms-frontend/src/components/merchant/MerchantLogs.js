import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MerchantLogs.css';

const MerchantLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  const API_BASE_URL = 'http://localhost:8000';
  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const merchant = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !merchant) {
        navigate('/merchant/login');
        return;
      }

      // might be an error
      const res = await axios.get(`${API_BASE_URL}/api/merchant/${merchant.merchant_id}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // Sort logs by timestamp (newest first)
      const sortedLogs = res.data.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      setLogs(sortedLogs);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch logs. ' + (err.response?.data?.detail || err.message));
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
      second: '2-digit',
      hour12: true
    });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="merchant-logs">
      <h2>Product Activity Logs</h2>
      
      <div className="logs-container">
        {logs.length === 0 ? (
          <p className="no-logs-message">No activity logs available.</p>
        ) : (
          <div className="logs-list">
            {logs.map((log, index) => (
              <div key={index} className="log-item">
                <div className="log-timestamp">
                  {formatDate(log.timestamp)}
                </div>
                <div className="log-details">
                  <h4>{log.product_name}</h4>
                  <p><strong>Action:</strong> {log.action}</p>
                  <p><strong>Category:</strong> {log.business_category}</p>
                  {log.price && <p><strong>Price:</strong> ₹{log.price}</p>}
                  {log.stock && <p><strong>Stock:</strong> {log.stock}</p>}
                  {log.description && <p><strong>Description:</strong> {log.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate('/merchant/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default MerchantLogs; 