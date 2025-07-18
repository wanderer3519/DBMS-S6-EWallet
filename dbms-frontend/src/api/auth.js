import axios from "axios";

const API_URL = "http://localhost:8000";

const authService = {
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      if (response.data.access_token) {
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || {
        detail: "An error occurred during login",
      };
    }
  },

  signup: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, userData);
      if (response.data.access_token) {
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || {
        detail: "An error occurred during signup",
      };
    }
  },

  logout: () => {
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  getAuthHeader: () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
      return { Authorization: `Bearer ${user.access_token}` };
    }
    return {};
  },
};

export default authService;
