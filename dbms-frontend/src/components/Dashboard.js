import { useState, React, useEffect } from 'react';
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API_BASE_URL = "http://127.0.0.1:8000";

const Dashboard = () => {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found!");
          return;
        }

        // 🔹 Decode JWT token to extract user_id
        const decodedToken = jwtDecode(token);
        const userId = decodedToken.sub; // Ensure the backend sets `sub` as the user_id

        console.log("User ID from Token:", userId);

        const response = await axios.get(`${API_BASE_URL}/wallet/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Wallet data:", response.data);
        setBalance(response.data.balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };
    fetchBalance();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Wallet Balance: {balance !== null ? `$${balance}` : "Loading..."}</p>
    </div>
  );
};

export default Dashboard