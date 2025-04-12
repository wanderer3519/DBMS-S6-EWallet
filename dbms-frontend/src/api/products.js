import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get auth header
const getAuthHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
};

// Get all products
export const getProducts = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/products/`, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to fetch products' };
    }
};

// Get featured products
export const getFeaturedProducts = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/products/featured`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to fetch featured products' };
    }
};

// Add to cart
export const addToCart = async (productId, quantity = 1) => {
    try {
        const response = await axios.post(
            `${API_URL}/api/cart/add`,
            { product_id: productId, quantity },
            { headers: getAuthHeader() }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to add item to cart' };
    }
};

// Get product by ID
export const getProductById = async (productId) => {
    try {
        const response = await axios.get(`${API_URL}/api/products/${productId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to fetch product' };
    }
};

// Get products by category
export const getProductsByCategory = async (category) => {
    try {
        const response = await axios.get(`${API_URL}/api/products/category/${category}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to fetch products by category' };
    }
};

// Get all categories
export const getCategories = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/products/categories`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { detail: 'Failed to fetch categories' };
    }
}; 