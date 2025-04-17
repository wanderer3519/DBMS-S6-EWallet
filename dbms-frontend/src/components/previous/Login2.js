import React from 'react'
import { useState } from 'react';
import { Outlet, Link, useNavigate } from "react-router-dom";
import { loginUser } from '../../api/auth';

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [error, setError] = useState(null);
  const navigate = useNavigate();



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser(formData);
      localStorage.setItem("token", data.access_token); // Store token
      navigate("/dashboard"); // Redirect after login
    } catch (err) {
      setError(err.detail || "Login failed");
    }
  };

  return (
    <div className='card m-2'>


      <div className="card-body d-flex flex-column">
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div>
          <strong> Username: </strong>
          <input type="text" className="form-control" placeholder="Your Username" aria-label="Username" aria-describedby="basic-addon1" name='username' onChange={handleChange} />
        </div>

        <div>
          <strong> Password: </strong>
          <input type="text" className="form-control" placeholder="Your Password" aria-label="Username" aria-describedby="basic-addon1" name='password' onChange={handleChange} />
        </div>

        <div>
          <button className='btn btn-outline-primary' onClick={handleSubmit}> Login </button>
        </div>

        <div>
          <Link to="/register"> Not registered? Sign up </Link>
        </div>
        {/* <h2>Login</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
                <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                <button type="submit">Login</button>
            </form> */}

      </div>

      <Outlet/>
    </div>
  )
}

export default Login