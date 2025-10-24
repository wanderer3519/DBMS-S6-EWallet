import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import axios from 'axios';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(email, password);
            if (result.success) {
                // The user object is now in context. We can decide where to navigate.
                const user = JSON.parse(localStorage.getItem('user'));
                if (user.role === 'admin') {
                    navigate('/admin-dashboard');
                } else if (user.role === 'merchant') {
                    navigate('/merchant-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(typeof result.error === 'string' ? result.error : 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-container">
                        <i className="fas fa-wallet logo-icon"></i>
                        <h1 className="logo-text">E-Wallet</h1>
                    </div>
                    <h2 className="auth-title">Sign in</h2>
                    <p className="auth-subtitle">to continue to E-Wallet</p>
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
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Email"
                            autoComplete="email"
                            className="auth-input"
                        />
                        <label htmlFor="email" className="input-label">Email</label>
                    </div>

                    <div className="input-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Password"
                            autoComplete="current-password"
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

                    <div className="auth-options">
                        <label className="checkbox-container">
                            <input type="checkbox" />
                            <span className="checkbox-label">Remember me</span>
                        </label>
                        <Link to="/forgot-password" className="link-text">Forgot password?</Link>
                    </div>

                    <div className="auth-actions">
                        <Link to="/signup" className="btn-text">
                            Create account
                        </Link>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                'Sign in'
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

export default Login;