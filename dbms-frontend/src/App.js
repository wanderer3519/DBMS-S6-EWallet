import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './routes/Navbar';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/user/Dashboard';
import Products from './components/product/Products';
import Cart from './components/cart/Cart';
import Checkout from './components/cart/Checkout';
import OrderConfirmation from './components/order/OrderConfirmation';
import MyOrders from './components/user/MyOrders';
import MerchantDashboard from './components/merchant/MerchantDashboard';
import MerchantLogin from './components/merchant/MerchantLogin';
import MerchantSignup from './components/merchant/MerchantSignup';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import AdminSignup from './components/admin/AdminSignup';
import MerchantLogs from './components/merchant/MerchantLogs';
import ProductDetails from './components/product/ProductDetails';
import MerchantProfile from './components/merchant/MerchantProfile';
import UserProfile from './components/user/UserProfile';
import RewardsConversion from './components/account/RewardsConversion';
import { AuthProvider, useAuth } from './context/AuthContext';
import Topup from './components/account/Topup';

// PrivateRoute component checks if the user is logged in and if they have the correct role to access the route
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth(); // Access user data from context
  const location = useLocation();

  // If the user is not logged in, redirect them to the appropriate login page
  if (!user) {
    console.log("No user found, redirecting to login");
    // Redirect based on the attempted route
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/merchant')) {
      return <Navigate to="/merchant/login" state={{ from: location }} replace />;
    } else {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  // If roles are provided, check if the user has the correct role
  if (roles && !roles.includes(user.role)) {
    console.log(`User role ${user.role} doesn't match required roles:`, roles);
    // Redirect user based on their role
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'merchant') {
      return <Navigate to="/merchant" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If all checks pass, render the requested component
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router> 
        <Navbar />
        <Container className="mt-4">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/merchant/signup" element={<MerchantSignup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:productId" element={<ProductDetails />} />
            
            {/* Home route - redirects to user dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected User Routes */}
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
            <Route path="/checkout" element={
              <PrivateRoute allowedRoles={['user']}>
                {/* <Checkout /> */}  
                <Checkout />
              </PrivateRoute>
            } />
            <Route path="/order-confirmation/:orderId" element={
              <PrivateRoute allowedRoles={['user']}>
                <OrderConfirmation />
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute>
                <MyOrders />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            } />
            <Route path="/top-up" element={
              <PrivateRoute>
                <Topup />
              </PrivateRoute>
            } />
            <Route path="/dashboard/conversion" element={
              <PrivateRoute>
                <RewardsConversion />
              </PrivateRoute>
            } />

            {/* Protected Merchant Routes */}
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
            <Route path="/merchant/profile" element={
              <PrivateRoute roles={['merchant']}>
                <MerchantProfile />
              </PrivateRoute>
            } />
            
            {/* Protected Admin Routes */}
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