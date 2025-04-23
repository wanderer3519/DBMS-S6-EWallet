import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        total_merchants: 0,
        total_orders: 0,
        total_products: 0,
        recent_activities: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }

        const fetchDashboardData = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/admin/dashboard', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const data = await response.json();
                setStats(data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, navigate]);

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <p>{stats.total_users}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Merchants</h3>
                    <p>{stats.total_merchants}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p>{stats.total_orders}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Products</h3>
                    <p>{stats.total_products}</p>
                </div>
            </div>

            <div className="recent-activities">
                <h2>Recent Activities</h2>
                <div className="activities-list">
                    {stats.recent_activities.map((activity, index) => (
                        <div key={index} className="activity-item">
                            <div className="activity-header">
                                <span className="user-email">{activity.user_email}</span>
                                <span className="user-role">{activity.user_role}</span>
                            </div>
                            <div className="activity-details">
                                <p className="action">{activity.action}</p>
                                <p className="description">{activity.description}</p>
                            </div>
                            <div className="activity-time">
                                {new Date(activity.created_at).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;