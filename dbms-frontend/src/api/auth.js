// import axios from "axios";

// const API_BASE_URL = "http://127.0.0.1:8000"; // Change if using a different backend URL

// export const registerUser = async (userData) => {
//   try {
//     const response = await axios.post(`${API_BASE_URL}/signup`, userData);
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || "Error registering user";
//   }
// };

// export const loginUser = async (credentials) => {
//   try {
//     const response = await axios.post(`${API_BASE_URL}/login`, credentials);
//     console.log("CREDS: ", credentials)
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || "Error logging in";
//   }
// };

import axios from "axios";

const API_URL = "http://localhost:8000";

const authService = {
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
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
      const response = await axios.post(`${API_URL}/signup`, userData);
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
