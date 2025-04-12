import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.access_token && parsedUser.user_id) {
            // Set default authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.access_token}`;
            
            // Verify token by making a request to get user data
            try {
              const endpoint = parsedUser.role === 'merchant' 
                ? `http://localhost:8000/merchant/profile/${parsedUser.user_id}`
                : `http://localhost:8000/user/profile/${parsedUser.user_id}`;
              
              const response = await axios.get(endpoint);
              if (response.data) {
                setUser({ ...parsedUser, ...response.data });
              } else {
                throw new Error('Invalid user data');
              }
            } catch (error) {
              console.error('Error verifying token:', error);
              // If token is invalid, clear user data
              localStorage.removeItem('user');
              delete axios.defaults.headers.common['Authorization'];
            }
          } else {
            // If user data is incomplete, clear it
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
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
    merchantLogin,
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