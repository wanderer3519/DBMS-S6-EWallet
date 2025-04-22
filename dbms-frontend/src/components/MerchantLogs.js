import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/MerchantLogs.css';

const MerchantLogs = () => {
  // State management
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    created: 0,
    updated: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(0);

// Modified fetchLogs function
const fetchLogs = async () => {
  setLoading(true);
  setError(null);

  try {
    // Fetch logs from the API
    const response = await axios.get('http://localhost:5000/api/merchant/{merchant_id}/logs');
    const logsData = response.data;

    // Sort logs by timestamp (newest first)
    logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setLogs(logsData);
    setFilteredLogs(logsData);
    setTotalPages(Math.ceil(logsData.length / logsPerPage));
    setStats({
      total: logsData.length,
      created: logsData.length, // All logs are product creations
      updated: 0, // No updates in this case
    });
    setLoading(false);
  } catch (err) {
    setError('Failed to fetch logs. Please try again later.');
    setLoading(false);
    console.error('Error fetching logs:', err);
  }
};


  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs based on filterType and searchTerm
  useEffect(() => {
    let result = [...logs];
    
    // Filter by action type
    if (filterType !== 'all') {
      result = result.filter(log => log.action === filterType);
    }
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.product.name.toLowerCase().includes(searchTermLower) ||
        log.product.id.toLowerCase().includes(searchTermLower) ||
        log.product.category.toLowerCase().includes(searchTermLower)
      );
    }
    
    setFilteredLogs(result);
    setTotalPages(Math.ceil(result.length / logsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, filterType, searchTerm, logsPerPage]);

  // Format date and calculate time ago
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
    
    return `${Math.floor(seconds)} second${seconds === 1 ? '' : 's'} ago`;
  };

  // Get logs for current page
  const getCurrentLogs = () => {
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    return filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  };

  // Pagination controls
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Handle case where we need ellipsis
      let startPage;
      let endPage;
      
      if (currentPage <= Math.floor(maxPagesToShow / 2) + 1) {
        // Near start
        startPage = 1;
        endPage = maxPagesToShow - 1;
        pageNumbers.push(...Array.from({ length: endPage }, (_, i) => i + 1));
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
        // Near end
        startPage = totalPages - (maxPagesToShow - 2);
        endPage = totalPages;
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        pageNumbers.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
      } else {
        // Middle
        startPage = currentPage - Math.floor((maxPagesToShow - 3) / 2);
        endPage = currentPage + Math.floor((maxPagesToShow - 3) / 2);
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        pageNumbers.push(...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchLogs();
  };

  // Render component
  return (
    <div className="merchant-logs">
      <div className="logs-header">
        <h2>Merchant Activity Logs</h2>
        <button className="refresh-btn" onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {/* Stats section */}
      <div className="logs-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <span>Total Activities</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">➕</div>
          <div className="stat-content">
            <h3>{stats.created}</h3>
            <span>Products Added</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>{stats.updated}</h3>
            <span>Products Updated</span>
          </div>
        </div>
      </div>

      <div className="logs-container">
        {/* Filter controls */}
        <div className="filter-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by product name, ID, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={filterType === 'all' ? 'active' : ''}
              onClick={() => setFilterType('all')}
            >
              All Activities
            </button>
            <button
              className={filterType === 'product_created' ? 'active' : ''}
              onClick={() => setFilterType('product_created')}
            >
              Products Added
            </button>
            <button
              className={filterType === 'product_updated' ? 'active' : ''}
              onClick={() => setFilterType('product_updated')}
            >
              Products Updated
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="simple-loading">
            <h3>Loading logs...</h3>
            <p>Please wait while we fetch the latest activity data.</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="simple-error">
            <h3>Error Loading Logs</h3>
            <p>{error}</p>
            <div>
              <button onClick={fetchLogs}>Try Again</button>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="no-logs-message">
            <h3>No logs found</h3>
            <p>
              {logs.length === 0
                ? 'No activity records found. Start adding or updating products to see logs here.'
                : 'No logs match your current filters. Try adjusting your search or filter criteria.'}
            </p>
          </div>
        )}

        {/* Logs list */}
        {!loading && !error && filteredLogs.length > 0 && (
          <>
            <div className="logs-list">
              {getCurrentLogs().map((log, index) => (
                <div key={index} className="log-item product-created">
                  <div className="log-timestamp">
                    <span className="log-action">Product Added</span>
                    {formatDate(log.timestamp)} <span>({timeAgo(log.timestamp)})</span>
                  </div>

                  <div className="log-product-details">
                    <div className="log-details">
                      <h4>{log.product_name}</h4>
                      <span className="product-id">Product ID: {log.product_id}</span>
                      <p className="log-description">{log.description || 'No description available'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="pagination">
              <button 
                className="page-btn prev" 
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="page-numbers">
                {getPaginationNumbers().map((pageNumber, index) => (
                  pageNumber === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="ellipsis">...</span>
                  ) : (
                    <button
                      key={pageNumber}
                      className={`page-btn ${pageNumber === currentPage ? 'active' : ''}`}
                      onClick={() => paginate(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                ))}
              </div>
              
              <button 
                className="page-btn next" 
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MerchantLogs;