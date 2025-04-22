import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Cart from './components/Cart';
import Orders from './components/Orders';
import MerchantDashboard from './components/MerchantDashboard';
import MerchantLogin from './components/MerchantLogin';
import MerchantSignup from './components/MerchantSignup';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import AdminSignup from './components/AdminSignup';
import MerchantLogs from './components/MerchantLogs';
import ProductDetails from './components/ProductDetails';
import { AuthProvider, useAuth } from './context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // If user isn't logged in, redirect to appropriate login page
  if (!user) {
    console.log("No user found, redirecting to login");
    
    // Determine which login page to redirect to based on the attempted route
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/merchant')) {
      return <Navigate to="/merchant/login" state={{ from: location }} replace />;
    } else {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }
  
  // If roles are specified and user doesn't have the required role, redirect
  if (roles && !roles.includes(user.role)) {
    console.log(`User role ${user.role} doesn't match required roles:`, roles);
    
    // Redirect based on user's role
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'merchant') {
      return <Navigate to="/merchant" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Container className="mt-4">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/merchant/signup" element={<MerchantSignup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:productId" element={<ProductDetails />} />
            
            {/* Home route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected user routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/cart" element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            } />
            
            {/* Protected merchant routes */}
            <Route path="/merchant" element={
              <PrivateRoute roles={['merchant']}>
                <MerchantDashboard />
              </PrivateRoute>
            } />
            <Route path="/merchant/dashboard" element={
              <PrivateRoute roles={['merchant']}>
                <MerchantDashboard />
              </PrivateRoute>
            } />
            <Route path="/merchant/logs" element={
              <PrivateRoute roles={['merchant']}>
                <MerchantLogs />
              </PrivateRoute>
            } />
            
            {/* Protected admin routes */}
            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
          </Routes>
        </Container>
      </Router>
    </AuthProvider>
  );
}

export default App;