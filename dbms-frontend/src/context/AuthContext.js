import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_token, setToken] = useState(null);

  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (storedToken && userData) {
        try {
          // Set token in component state
          setToken(storedToken);
          
          // Set default authorization header for axios
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const parsedUser = JSON.parse(userData);
          if (parsedUser.user_id) {
            // We'll validate the token by making a request to get the user profile
            try {
              // Get user profile endpoint determined by role
              const endpoint = `${API_BASE_URL}/api/account/user/profile`;
              
              const response = await axios.get(endpoint, {
                headers: {
                  Authorization: `Bearer ${storedToken}`
                }
              });
              
              if (response.data) {
                setUser({ ...parsedUser, ...response.data });
                console.log('User authenticated from stored credentials');
              } else {
                throw new Error('Invalid user data');
              }
            } catch (error) {
              console.error('Error verifying token:', error);
              // If token is invalid, clear user data
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              delete axios.defaults.headers.common['Authorization'];
            }
          } else {
            // If user data is incomplete, clear it
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
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

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });

      if (response.data.access_token) {
        const tokenValue = response.data.access_token;
        
        // Set the authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`;
        
        const userData = {
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role,
          account: response.data.account
        };

        // Store token and user data in localStorage
        localStorage.setItem('token', tokenValue);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setToken(tokenValue);
        
        console.log('Login successful, token stored');
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
      const response = await axios.post(`${API_BASE_URL}/api/merchant/login`, {
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
      const response = await axios.post(`${API_BASE_URL}/api/admin/login`, {
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