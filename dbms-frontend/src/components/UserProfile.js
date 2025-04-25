import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = ({ adminView }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const navigate = useNavigate();
    const { userId } = useParams();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Choose the right endpoint based on whether it's admin view or not
                const endpoint = adminView 
                    ? `http://localhost:8000/api/admin/user/${userId}`
                    : 'http://localhost:8000/user/me';
                
                const response = await axios.get(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setProfile(response.data);
                setFormData({
                    full_name: response.data.full_name,
                    email: response.data.email,
                    password: '',
                    confirmPassword: '',
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching profile:', error);
                setError('Failed to load profile. Please try again.');
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate, adminView, userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:8000/user/update', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Refresh profile data
            const response = await axios.get('http://localhost:8000/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setProfile(response.data);
            setEditMode(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Failed to update profile. Please try again.');
        }
    };

    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="user-profile-container">
            {adminView && (
                <div className="admin-view-banner">
                    <button 
                        className="back-to-admin-btn"
                        onClick={() => navigate('/admin')}
                    >
                        ← Back to Admin Dashboard
                    </button>
                    <span className="admin-view-label">
                        Admin View - Viewing User #{userId} Profile
                    </span>
                </div>
            )}
            
            <h1>
                {adminView ? `${profile.full_name}'s Profile` : 'My Profile'}
            </h1>
            
            {!editMode ? (
                <div className="profile-details">
                    <div className="profile-field">
                        <label>Name:</label>
                        <span>{profile.full_name}</span>
                    </div>
                    <div className="profile-field">
                        <label>Email:</label>
                        <span>{profile.email}</span>
                    </div>
                    <div className="profile-field">
                        <label>User ID:</label>
                        <span>{profile.user_id}</span>
                    </div>
                    <div className="profile-field">
                        <label>Role:</label>
                        <span>{profile.role}</span>
                    </div>
                    <div className="profile-field">
                        <label>Status:</label>
                        <span>{profile.status}</span>
                    </div>
                    <div className="profile-field">
                        <label>Balance:</label>
                        <span>₹{adminView ? profile.account_balance : profile.account?.balance}</span>
                    </div>
                    {adminView && (
                        <>
                            <div className="profile-field">
                                <label>Total Orders:</label>
                                <span>{profile.order_count}</span>
                            </div>
                            <div className="profile-field">
                                <label>Total Spent:</label>
                                <span>₹{profile.total_spent?.toFixed(2)}</span>
                            </div>
                            <div className="profile-field">
                                <label>Reward Points:</label>
                                <span>{profile.reward_points}</span>
                            </div>
                        </>
                    )}
                    <div className="profile-field">
                        <label>Member Since:</label>
                        <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="profile-actions">
                        {!adminView && (
                            <button 
                                className="edit-profile-btn"
                                onClick={() => setEditMode(true)}
                            >
                                Edit Profile
                            </button>
                        )}
                        <button 
                            className="back-btn"
                            onClick={() => adminView ? navigate('/admin') : navigate('/dashboard')}
                        >
                            Back to {adminView ? 'Admin Dashboard' : 'Dashboard'}
                        </button>
                        {adminView && (
                            <button 
                                className="view-orders-btn"
                                onClick={() => navigate(`/admin/view-user/${userId}/orders`)}
                            >
                                View Orders
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <form className="edit-profile-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="full_name">Name</label>
                        <input
                            type="text"
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">New Password (leave blank to keep current)</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="save-btn">Save Changes</button>
                        <button 
                            type="button" 
                            className="cancel-btn"
                            onClick={() => setEditMode(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UserProfile;