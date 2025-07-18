import React from "react";
import axios from "axios";

const Topup = () => {
    const API_BASE_URL = 'http://localhost:8000'; 
    const [accId, setaccId] = React.useState(null);
    // const [_amount, setAmount] = React.useState(0);

    const fetchAccountId = async () => {

        try {
            const userResponse = await axios.get(`${API_BASE_URL}/api/user/me`);
            const userId = userResponse.data.user_id;    

            const accResponse = await axios.get(`${API_BASE_URL}/api/account/user/${userId}`);
            const accountId = accResponse.data[0].account_id;

            setaccId(accountId);

            console.log("Account ID:", accountId);
        }
        catch (error) {
            console.error("Error fetching account ID:", error);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Call the API to top up the account
        const response = await fetch(`${API_BASE_URL}/api/accounts/${accId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            // body: JSON.stringify({ amount })
        });

        if (response.ok) {
            alert("Top up successful!");
        } else {
            alert("Top up failed. Please try again.");
        }
        

    }

    fetchAccountId();
    return (
        
            <div className="container-fluid">
                <h1>Top Up Your Account</h1>
                <form onSubmit={(e) => {handleSubmit(e)}}>
                    <div className="form-group">
                        <label htmlFor="amount">Amount:</label>
                        <input type="number" className="form-control" id="amount" placeholder="Enter amount" />
                    </div>
                    <button type="submit" className="btn btn-primary">Top Up</button>
                </form>
            </div>
        
    )
}

export default Topup;
