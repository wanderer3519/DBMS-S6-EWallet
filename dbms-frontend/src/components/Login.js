import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const userRequestOptions = {
      headers: { 'Content-type': 'application/x-www-urlencoded' },
      body: JSON.stringify(
        `grant_type=&username=${email}&password=${password}&scope=&client_id=&client_secret=`
      )
    }

  try {
    const authResponse = await axios.post('http://localhost:8000/api/login', userRequestOptions);
    
  }
  catch (error) {
    console.error('Authorization error:', error);
    setError('An unexpected error occurred');
  }

  try {

    const result = await login(email, password);
    if (result.success) {
      // Navigate to dashboard
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    setError('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};

return (
  <div className="login-container">
    <div className="login-box">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="login-button"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="signup-link">
        Don't have an account? <a href="/signup">Sign up</a>
      </p>
    </div>
  </div>
);
};

export default Login;