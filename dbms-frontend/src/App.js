import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import OrderConfirmation from './components/OrderConfirmation';
import MyOrders from './components/MyOrders';
import MerchantDashboard from './components/MerchantDashboard';
import MerchantLogin from './components/MerchantLogin';
import MerchantSignup from './components/MerchantSignup';
import AdminDashboard from './components/AdminDashboard';
import MerchantLogs from './components/MerchantLogs';
import ProductDetails from './components/ProductDetails';
import MerchantProfile from './components/MerchantProfile';
import UserProfile from './components/UserProfile';
import RewardsConversion from './components/RewardsConversion';
import { AuthProvider, useAuth } from './context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  console.log('PrivateRoute rendering with path:', location.pathname);
  console.log('User authenticated:', !!user);
  
  if (!user) {
    // Redirect to login while saving the attempted URL
    console.log('Redirecting to login, no user found');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    console.log('User role not authorized:', user.role, 'Required roles:', roles);
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('Rendering protected component for path:', location.pathname);
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Container className="mt-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/merchant/signup" element={<MerchantSignup />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/dashboard/conversion" element={
              <PrivateRoute>
                <RewardsConversion />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            } />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:productId" element={<ProductDetails />} />
            <Route path="/cart" element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            } />
            <Route path="/checkout" element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            } />
            <Route path="/order-confirmation/:orderId" element={
              <PrivateRoute>
                <OrderConfirmation />
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute>
                <MyOrders />
              </PrivateRoute>
            } />
            <Route path="/merchant" element={
              <PrivateRoute roles={['merchant']}>
                <MerchantDashboard />
              </PrivateRoute>
            } />
            <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
            <Route path="/merchant/logs" element={<MerchantLogs />} />
            <Route path="/merchant/profile" element={<MerchantProfile />} />
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
   