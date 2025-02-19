import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000"; // Change if using a different backend URL

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/signup`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || "Error registering user";
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/login`, credentials);
    console.log("CREDS: ", credentials)
    return response.data;
  } catch (error) {
    throw error.response?.data || "Error logging in";
  }
};
