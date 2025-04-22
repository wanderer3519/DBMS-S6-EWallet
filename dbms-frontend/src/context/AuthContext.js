import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (savedToken && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          
          setUser(parsedUser);
          setToken(savedToken);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData, password) => {
    // If login is called with object (direct data)
    if (userData && typeof userData === 'object' && userData.access_token) {
      const token = userData.access_token;
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Create user object
      const userObj = {
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name || userData.full_name,
        role: userData.role,
        account: userData.account
      };
      
      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userObj));
      
      // Update state
      setUser(userObj);
      setToken(token);
      
      return { success: true };
    } 
    // If login is called with email, password (string params)
    else if (typeof userData === 'string' && typeof password === 'string') {
      return loginWithCredentials(userData, password);
    }
    
    return { success: false, error: 'Invalid login data' };
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:8000/login', {
        email,
        password
      });

      if (response.data.access_token) {
        // Set the authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        const userData = {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role,
          account: response.data.account
        };

        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setToken(response.data.access_token);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        console.log("error.response", error.response);
        if (error.response.status === 401) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.response.status === 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        }
        return { success: false, error: error.response.data.detail || 'Login failed' };
      }
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const merchantLogin = async (email, password) => {
    try {
      console.log('Merchant login attempt:', email);
      const response = await axios.post('http://localhost:8000/merchant/login', {
        email,
        password
      });

      if (response.data.access_token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        const userData = {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name,
          role: 'merchant',
          business_name: response.data.business_name,
          business_category: response.data.business_category
        };

        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setToken(response.data.access_token);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Merchant login error:', error);
      if (error.response) {
        if (error.response.status === 401) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.response.status === 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        }
        return { success: false, error: error.response.data.detail || 'Login failed' };
      }
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      console.log('Admin login attempt with:', email);
      const response = await axios.post('http://localhost:8000/admin/login', {
        email,
        password
      });

      console.log('Admin login response:', response.data);
      
      if (response.data.access_token) {
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        // Create user object with admin role
        const userData = {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name || response.data.full_name,
          role: 'admin' // Explicit admin role
        };

        console.log('Setting admin user data:', userData);
        
        // Store in localStorage
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setToken(response.data.access_token);
        
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.response) {
        if (error.response.status === 401) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.response.status === 403) {
          return { success: false, error: 'Access forbidden. Admin privileges required.' };
        }
        if (error.response.status === 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        }
        return { success: false, error: error.response.data.detail || 'Login failed' };
      }
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    loading,
    login,
    loginWithCredentials,
    merchantLogin,
    adminLogin,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isMerchant: user?.role === 'merchant'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};