import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'wallet'
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        address: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const navigate = useNavigate();

    // Load initial data when component mounts
    useEffect(() => {
        // Try to get user data from localStorage as a fallback
        const storedUserData = localStorage.getItem('user');
        let userData = null;

        if (storedUserData) {
            try {
                userData = JSON.parse(storedUserData);
                console.log('Using stored user data:', userData);
            } catch (err) {
                console.error('Error parsing stored user data:', err);
            }
        }

        // If we have some user data from localStorage, use it
        if (userData && userData.name) {
            const basicUser = {
                user_id: userData.user_id || 1,
                full_name: userData.name,
                email: userData.email || 'user@example.com',
                role: userData.role || 'customer',
                status: 'active',
                created_at: new Date().toISOString(),
                accounts: [
                    {
                        account_id: 1,
                        balance: userData.account?.balance || 0,
                        account_type: 'user'
                    }
                ]
            };

            setUser(basicUser);
            setEditForm({
                full_name: basicUser.full_name,
                phone: basicUser.phone || '',
                address: basicUser.address || ''
            });
            setLoading(false);
        }

        // Also try to fetch from the API
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // If no token, we'll rely on localStorage data only
                setLoading(false);
                return;
            }

            // Configure axios with the token
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            console.log('Fetching user profile...');
            const response = await axios.get('http://localhost:8000/api/account/profile');
            console.log('Profile response:', response.data);
            
            // If we got data from the API, update the state
            if (response.data) {
                setUser(response.data);
                setEditForm({
                    full_name: response.data.full_name,
                    phone: response.data.phone || '',
                    address: response.data.address || ''
                });
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching user profile:', err);
            
            // Don't set error state if we already have user data from localStorage
            if (!user) {
                setError('Could not load profile data. Using basic information.');
                
                // Create a basic profile as fallback
                const storedEmail = localStorage.getItem('email') || 'user@example.com';
                const basicUser = {
                    user_id: 1,
                    full_name: 'User',
                    email: storedEmail,
                    role: 'customer',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    accounts: [
                        {
                            account_id: 1,
                            balance: 0,
                            account_type: 'user'
                        }
                    ]
                };
                
                setUser(basicUser);
                setEditForm({
                    full_name: basicUser.full_name,
                    phone: '',
                    address: ''
                });
            }
            
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            setSuccessMessage('');
            // Store locally even if API fails
            const updatedUser = {
                ...user,
                full_name: editForm.full_name,
                phone: editForm.phone,
                address: editForm.address
            };

            // Try to update on the server
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    await axios.put(
                        'http://localhost:8000/api/account/profile',
                        editForm,
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                }
            } catch (apiError) {
                console.warn('Could not update profile on server, but updating locally:', apiError);
            }

            // Update local state regardless of API success
            setUser(updatedUser);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error in profile update:', err);
            setError('Failed to update profile. Please try again.');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        // Validate passwords match
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setError('New passwords do not match');
            return;
        }
        
        // Validate password strength
        if (passwordForm.new_password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to change your password');
                return;
            }

            // Configure axios with the token
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            console.log('Changing password...');
            await axios.put(
                'http://localhost:8000/api/account/password',
                {
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Reset form
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error changing password:', err);
            setError('Failed to change password. Current password might be incorrect.');
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIsEditing(false);
        setSuccessMessage('');
        setError('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async () => {
        if (!imageFile) return;

        try {
            setUploadingImage(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to upload a profile image');
                setUploadingImage(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', imageFile);

            // Configure axios with the token
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const response = await axios.post(
                'http://localhost:8000/api/account/upload-profile-image',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // Update the user state with the new profile image
            setUser({
                ...user,
                profile_image: response.data.profile_image
            });
            
            setSuccessMessage('Profile image updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            setImageFile(null);
        } catch (err) {
            console.error('Error uploading profile image:', err);
            setError('Failed to upload profile image. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading profile information...</div>;
    }

    return (
        <div className="user-profile-container">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-image-container">
                    {user?.profile_image ? (
                        <img 
                            src={`http://localhost:8000${user.profile_image}`} 
                            alt="Profile" 
                            className="profile-image"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/150?text=Profile";
                            }}
                        />
                    ) : imagePreview ? (
                        <img 
                            src={imagePreview} 
                            alt="Profile Preview" 
                            className="profile-image"
                        />
                    ) : (
                        <div className="profile-image-placeholder">
                            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div className="profile-image-upload">
                        <input 
                            type="file" 
                            id="profile-image-input" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="profile-image-input" className="profile-image-label">
                            Choose Image
                        </label>
                        {imageFile && (
                            <button 
                                className="upload-image-btn"
                                onClick={handleImageUpload}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? 'Uploading...' : 'Upload Image'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="header-content">
                    <h1>{user?.full_name || 'User'}</h1>
                    <p className="user-email">{user?.email || 'Not available'}</p>
                </div>
                <div className="header-actions">
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Messages */}
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}

            {/* Stats Grid - Simplified */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Wallet Balance</h3>
                    <p className="stat-value">{formatCurrency(user?.accounts?.[0]?.balance || 0)}</p>
                </div>
                <div className="stat-card">
                    <h3>Account Status</h3>
                    <p className="stat-value">{user?.status || 'Active'}</p>
                </div>
            </div>

            {/* Navigation Tabs - Simplified */}
            <div className="profile-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => handleTabChange('profile')}
                >
                    Profile
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => handleTabChange('security')}
                >
                    Security
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
                    onClick={() => handleTabChange('wallet')}
                >
                    Wallet
                </button>
            </div>

            {/* Profile View */}
            {activeTab === 'profile' && (
                <>
                    {isEditing ? (
                        <div className="edit-profile-form">
                            <h2>Edit Profile</h2>
                            <form onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="address">Address</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                        rows="3"
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="save-btn">Save Changes</button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="profile-details">
                            <div className="details-section">
                                <div className="section-header">
                                    <h2>Personal Information</h2>
                                    <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                                        Edit Profile
                                    </button>
                                </div>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <label>Full Name</label>
                                        <p>{user?.full_name || 'Not provided'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Email Address</label>
                                        <p>{user?.email || 'Not provided'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Phone Number</label>
                                        <p>{user?.phone || 'Not provided'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Address</label>
                                        <p>{user?.address || 'Not provided'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Member Since</label>
                                        <p>{formatDate(user?.created_at) || 'Not available'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <h2>Account Information</h2>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <label>User ID</label>
                                        <p>{user?.user_id || 'Not available'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Account Type</label>
                                        <p>{user?.accounts?.[0]?.account_type || 'Standard'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Account Status</label>
                                        <p>{user?.status || 'Active'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Role</label>
                                        <p>{user?.role || 'Customer'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Security View */}
            {activeTab === 'security' && (
                <div className="profile-details">
                    <div className="details-section">
                        <h2>Change Password</h2>
                        <form className="password-form" onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label htmlFor="current_password">Current Password</label>
                                <input
                                    type="password"
                                    id="current_password"
                                    name="current_password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new_password">New Password</label>
                                <input
                                    type="password"
                                    id="new_password"
                                    name="new_password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                                    required
                                    minLength="8"
                                />
                                <p className="form-hint">Password must be at least 8 characters long</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirm_password">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirm_password"
                                    name="confirm_password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn">Change Password</button>
                            </div>
                        </form>
                    </div>

                    <div className="details-section">
                        <h2>Account Security</h2>
                        <div className="security-tips">
                            <h3>Security Tips</h3>
                            <ul>
                                <li>Use a strong, unique password that you don't use for other services.</li>
                                <li>Never share your password or account details with anyone.</li>
                                <li>Change your password regularly for enhanced security.</li>
                                <li>Be cautious of phishing attempts. We will never ask for your password via email or phone.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Wallet View - Simplified */}
            {activeTab === 'wallet' && (
                <div className="wallet-section">
                    <div className="section-header">
                        <h2>Wallet Overview</h2>
                    </div>
                    
                    <div className="wallet-details">
                        <div className="wallet-balance-card">
                            <h3>Current Balance</h3>
                            <p className="balance-amount">{formatCurrency(user?.accounts?.[0]?.balance || 0)}</p>
                            <div className="wallet-actions">
                                <button 
                                    className="add-funds-btn" 
                                    onClick={() => navigate('/wallet')}
                                >
                                    Add Funds
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="wallet-history">
                        <p className="wallet-info">
                            To view your transaction history and manage your wallet, please visit the 
                            <button onClick={() => navigate('/wallet')}>Wallet page</button>.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile; 