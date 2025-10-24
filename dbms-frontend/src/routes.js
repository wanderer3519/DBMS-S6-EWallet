import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Products from './components/Products';
import ProductDetails from './components/product/ProductDetails';
import Cart from './components/Cart';
import OrderHistory from './components/order/OrderHistory';
import UserProfile from './components/profile/UserProfile';
import MerchantDashboard from './components/MerchantDashboard';

import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';
import ThemeTest from './components/shared/ThemeTest';
import UserDashboard from './components/dashboard/UserDashboard';

const PrivateRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetails />} />
        <Route path="/theme-test" element={<ThemeTest />} />
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={['user', 'merchant', 'admin']}>
            <UserDashboard />
          </PrivateRoute>
        } />
        <Route path="/cart" element={
          <PrivateRoute allowedRoles={['user']}>
            <Cart />
          </PrivateRoute>
        } />
        <Route path="/orders" element={
          <PrivateRoute allowedRoles={['user']}>
            <OrderHistory />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute allowedRoles={['user']}>
            <UserProfile />
          </PrivateRoute>
        } />
        <Route path="/merchant-dashboard" element={
          <PrivateRoute allowedRoles={['merchant']}>
            <MerchantDashboard />
          </PrivateRoute>
        } />
        <Route path="/admin-dashboard" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
};

export default AppRoutes;