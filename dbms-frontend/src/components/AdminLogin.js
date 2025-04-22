import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { adminLogin, user, isAdmin } = useAuth();

  // Check if already logged in as admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      console.log('Already logged in as admin, redirecting to admin dashboard');
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Admin login attempt with email:', email);

    try {
      // Use the adminLogin function from AuthContext
      const result = await adminLogin(email, password);
      console.log('Admin login result:', result);
      
      if (result.success) {
        console.log('Admin login successful, redirecting to admin dashboard');
        
        // Small delay to allow the user state to update before navigating
        setTimeout(() => {
          navigate('/admin');
        }, 500);
      } else {
        setError(result.error || 'Failed to login. Please check your credentials.');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Admin Login</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
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
              <Button disabled={loading} className="w-100 mt-3" type="submit">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Need an account? <Link to="/admin/signup">Sign Up</Link>
        </div>
      </div>
    </Container>
  );
};

export default AdminLogin;