import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AdminSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    console.log('Admin signup attempt:', email);

    try {
      const response = await axios.post('http://localhost:8000/admin/signup', {
        email: email,
        password: password,
        full_name: fullName,
        role: 'admin'
      });

      if (response.data && response.data.access_token) {
        console.log('Admin signup successful');
        
        // Store token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Create user object
        const userData = {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name || fullName,
          role: 'admin' // Explicitly set role to admin
        };
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Call login function
        login(userData);
        
        console.log('Redirecting to admin dashboard');
        navigate('/admin');
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Admin signup error:', error);
      setError(error.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Admin Sign Up</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group id="fullName" className="mb-3">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Form.Group>
              <Form.Group id="email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Form.Group>
              <Form.Group id="password" className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
              <Form.Group id="confirmPassword" className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Form.Group>
              <Button disabled={loading} className="w-100 mt-3" type="submit">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Already have an account? <Link to="/admin/login">Log In</Link>
        </div>
      </div>
    </Container>
  );
};

export default AdminSignup;