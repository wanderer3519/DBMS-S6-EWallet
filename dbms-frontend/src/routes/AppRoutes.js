import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../components/Login';
import Signup from '../components/Signup';
import Products from '../components/Products';
import Cart from '../components/Cart';
import Dashboard from '../components/Dashboard';
import MerchantDashboard from '../components/MerchantDashboard';
import AdminDashboard from '../components/AdminDashboard';
import NoPage from '../components/NoPage';

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Products />
        </PrivateRoute>
      } />
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
      
      <Route path="/merchant" element={
        <PrivateRoute roles={['merchant']}>
          <MerchantDashboard />
        </PrivateRoute>
      } />
      
      <Route path="/admin" element={
        <PrivateRoute roles={['admin']}>
          <AdminDashboard />
        </PrivateRoute>
      } />
      
      <Route path="*" element={<NoPage />} />
    </Routes>
  );
};

export default AppRoutes; 