import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Page from '../shared/Page';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import './UserProfile.css';

const UserProfile = () => {
    const { user: authUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: ''
    });

    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/account/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data);
            setFormData({
                full_name: response.data.full_name || '',
                email: response.data.email || '',
                phone: response.data.phone || ''
            });
            setError(null);
        } catch (err) {
            setError('Failed to load profile. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
        setPasswordError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/account/user/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Update local user object
            const updatedUser = localStorage.getItem('user');
            if (updatedUser) {
                const userObj = JSON.parse(updatedUser);
                userObj.full_name = formData.full_name;
                userObj.email = formData.email;
                localStorage.setItem('user', JSON.stringify(userObj));
            }
            
            setSuccessMessage('✅ Profile updated successfully!');
            setEditing(false);
            await fetchProfile();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            full_name: user.full_name || '',
            email: user.email || '',
            phone: user.phone || ''
        });
        setEditing(false);
        setError(null);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError('New passwords do not match');
            return;
        }
        
        if (passwordData.new_password.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
            return;
        }
        
        try {
            setChangingPassword(true);
            setPasswordError('');
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE_URL}/api/user/password`,
                {
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            setSuccessMessage('✅ Password changed successfully!');
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setPasswordError(err.response?.data?.detail || 'Failed to change password. Please check your current password.');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, or WebP)');
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            
            setAvatarFile(file);
            setError(null);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;
        
        try {
            setUploadingAvatar(true);
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', avatarFile);
            
            const response = await axios.post(
                `${API_BASE_URL}/api/user/avatar`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            setSuccessMessage('✅ Profile picture updated successfully!');
            setAvatarFile(null);
            setAvatarPreview(null);
            await fetchProfile();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload profile picture');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <Page title="My Profile" icon="fas fa-user" backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}>
                <LoadingSkeleton height="300px" />
            </Page>
        );
    }

    if (error && !user) {
        return (
            <Page title="My Profile" icon="fas fa-user" backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}>
                <div className="alert alert-danger">{error}</div>
            </Page>
        );
    }

    return (
        <Page
            title="My Profile"
            subtitle="Manage your account information"
            icon="fas fa-user"
            breadcrumbs={[
                { name: 'Home', path: '/' },
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Profile' }
            ]}
            backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}
        >
            {successMessage && (
                <div className="alert alert-success mb-3 fade-in">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="alert alert-danger mb-3">
                    {error}
                </div>
            )}

            <div className="profile-container">
                <div className="section-card profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar-container">
                            {user?.profile_image ? (
                                <img 
                                    src={`${API_BASE_URL}${user.profile_image.replace('uploads', '/uploads')}`} 
                                    alt="Profile" 
                                    className="profile-avatar-img"
                                />
                            ) : avatarPreview ? (
                                <img 
                                    src={avatarPreview} 
                                    alt="Preview" 
                                    className="profile-avatar-img"
                                />
                            ) : (
                                <div className="profile-avatar">
                                    <i className="fas fa-user-circle"></i>
                                </div>
                            )}
                            <div className="avatar-upload-btn">
                                <label htmlFor="avatar-input" className="btn-upload-avatar">
                                    <i className="fas fa-camera"></i>
                                </label>
                                <input
                                    type="file"
                                    id="avatar-input"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                        <div className="profile-info">
                            <h2>{user?.full_name || authUser?.full_name}</h2>
                            <p className="role-badge">
                                <i className="fas fa-shield-alt me-2"></i>
                                {user?.role || authUser?.role || 'User'}
                            </p>
                            {avatarFile && (
                                <div className="avatar-actions">
                                    <button 
                                        className="btn-upload-confirm" 
                                        onClick={handleAvatarUpload}
                                        disabled={uploadingAvatar}
                                    >
                                        {uploadingAvatar ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check me-2"></i>
                                                Upload Picture
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        className="btn-upload-cancel" 
                                        onClick={() => {
                                            setAvatarFile(null);
                                            setAvatarPreview(null);
                                        }}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editing && (
                            <button className="btn-edit" onClick={() => setEditing(true)}>
                                <i className="fas fa-edit me-2"></i>
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="full_name">
                                <i className="fas fa-user me-2"></i>
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="full_name"
                                name="full_name"
                                className="form-control"
                                value={formData.full_name}
                                onChange={handleChange}
                                disabled={!editing}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <i className="fas fa-envelope me-2"></i>
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-control"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!editing}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                <i className="fas fa-phone me-2"></i>
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                className="form-control"
                                value={formData.phone}
                                onChange={handleChange}
                                disabled={!editing}
                                placeholder="Enter your phone number"
                            />
                        </div>

                        {editing && (
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                                    <i className="fas fa-times me-2"></i>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save me-2"></i>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="section-card account-info-card">
                    <h3>Account Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <i className="fas fa-id-badge info-icon"></i>
                            <div>
                                <div className="info-label">User ID</div>
                                <div className="info-value">#{user?.user_id}</div>
                            </div>
                        </div>
                        <div className="info-item">
                            <i className="fas fa-calendar-alt info-icon"></i>
                            <div>
                                <div className="info-label">Member Since</div>
                                <div className="info-value">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div className="info-item">
                            <i className="fas fa-check-circle info-icon"></i>
                            <div>
                                <div className="info-label">Account Status</div>
                                <div className="info-value">
                                    <span className={`badge bg-${user?.status === 'active' ? 'success' : 'warning'}`}>
                                        {user?.status || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section-card password-card">
                    <h3>
                        <i className="fas fa-lock me-2"></i>
                        Change Password
                    </h3>
                    <p className="text-muted">Update your password to keep your account secure</p>

                    {passwordError && (
                        <div className="alert alert-danger mb-3">
                            {passwordError}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="current_password">
                                <i className="fas fa-key me-2"></i>
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="current_password"
                                name="current_password"
                                className="form-control"
                                value={passwordData.current_password}
                                onChange={handlePasswordChange}
                                required
                                placeholder="Enter current password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_password">
                                <i className="fas fa-lock me-2"></i>
                                New Password
                            </label>
                            <input
                                type="password"
                                id="new_password"
                                name="new_password"
                                className="form-control"
                                value={passwordData.new_password}
                                onChange={handlePasswordChange}
                                required
                                placeholder="Enter new password (min. 8 characters)"
                                minLength="8"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm_password">
                                <i className="fas fa-check-circle me-2"></i>
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirm_password"
                                name="confirm_password"
                                className="form-control"
                                value={passwordData.confirm_password}
                                onChange={handlePasswordChange}
                                required
                                placeholder="Confirm new password"
                                minLength="8"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                                {changingPassword ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Changing Password...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save me-2"></i>
                                        Change Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Page>
    );
};

export default UserProfile;
