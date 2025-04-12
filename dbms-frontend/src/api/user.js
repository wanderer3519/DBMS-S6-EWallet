import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const getUserProfile = async (userId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/user/profile/${userId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || "Error fetching user profile";
    }
};

export const getAccountBalance = async (accountId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/accounts/${accountId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || "Error fetching account balance";
    }
};

export const topUpAccount = async (accountId, amount) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/accounts/${accountId}/top-up`, {
            amount: amount
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || "Error topping up account";
    }
}; 