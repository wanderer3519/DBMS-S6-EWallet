import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../api/auth';
import './Signup.css';

const Signup = () => {
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        confirm_password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, label: '' };
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/\d/)) strength++;
        if (password.match(/[^a-zA-Z\d]/)) strength++;
        
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        return { strength, label: labels[strength] };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        try {
            const { confirm_password, ...signupData } = formData;
            await authService.signup(signupData);
            navigate('/login', { state: { message: 'Account created successfully! Please login.' } });
        } catch (err) {
            setError(err.detail || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card signup-card">
                <div className="auth-header">
                    <div className="logo-container">
                        <i className="fas fa-wallet logo-icon"></i>
                        <h1 className="logo-text">E-Wallet</h1>
                    </div>
                    <h2 className="auth-title">Create your Account</h2>
                    <p className="auth-subtitle">Join E-Wallet to manage your finances</p>
                </div>

                {error && (
                    <div className="auth-error">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <input
                            type="text"
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            placeholder="Full Name"
                            className="auth-input"
                        />
                        <label htmlFor="full_name" className="input-label">Full Name</label>
                    </div>

                    <div className="input-group">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            placeholder="Email"
                            autoComplete="email"
                            className="auth-input"
                        />
                        <label htmlFor="email" className="input-label">Email</label>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                placeholder="Password"
                                autoComplete="new-password"
                                className="auth-input"
                            />
                            <label htmlFor="password" className="input-label">Password</label>
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>

                        <div className="input-group">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirm_password"
                                name="confirm_password"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                placeholder="Confirm"
                                autoComplete="new-password"
                                className="auth-input"
                            />
                            <label htmlFor="confirm_password" className="input-label">Confirm</label>
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {formData.password && (
                        <div className="password-strength">
                            <div className="strength-bar">
                                <div 
                                    className={`strength-fill strength-${passwordStrength.strength}`}
                                    style={{ width: `${passwordStrength.strength * 25}%` }}
                                ></div>
                            </div>
                            <span className="strength-label">{passwordStrength.label}</span>
                        </div>
                    )}

                    <div className="auth-info">
                        <p>
                            <i className="fas fa-info-circle"></i>
                            Use 8 or more characters with a mix of letters, numbers & symbols
                        </p>
                    </div>

                    <div className="auth-actions">
                        <Link to="/login" className="btn-text">
                            Sign in instead
                        </Link>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                'Create account'
                            )}
                        </button>
                    </div>
                </form>

                <div className="auth-footer">
                    <div className="footer-links">
                        <a href="#help">Help</a>
                        <a href="#privacy">Privacy</a>
                        <a href="#terms">Terms</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup; 