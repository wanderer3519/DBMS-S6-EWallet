import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Products from './components/Products';
import Cart from './components/Cart';
import MerchantDashboard from './components/MerchantDashboard';

import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

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
        <Route path="/cart" element={
          <PrivateRoute allowedRoles={['user']}>
            <Cart />
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