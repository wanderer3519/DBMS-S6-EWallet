import { useState } from 'react';
import { Outlet, Link, useNavigate } from "react-router-dom";
import { registerUser } from '../api/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(formData);
      navigate("/"); // Redirect to login page after successful registration
    } catch (err) {
      setError(err.detail || "Registration failed");
    }
  };

  return (
    <div className='card m-2'>
      <div className="card-body d-flex flex-column">

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div>
          <strong> Full Name: </strong>
          <input type="text" className="form-control" placeholder="Your Full name" aria-label="Username" aria-describedby="basic-addon1" name='username' onChange={handleChange} />
        </div>

        <div>
          <strong> Email: </strong>
          <input type="text" className="form-control" placeholder="Your email" aria-label="email" aria-describedby="basic-addon1" name='email' onChange={handleChange} />
        </div>

        <div>
          <strong> Password: </strong>
          <input type="text" className="form-control" placeholder="Your Password" aria-label="password" aria-describedby="basic-addon1" name='password' onChange={handleChange} />
        </div>

        <div>
          <button className='btn btn-outline-primary' onClick={handleSubmit}> Register</button>
        </div>

        <div>
          <Link to="/"> Already a user? Sign In </Link>
        </div>

      </div>

      <Outlet />
      {/* <div className="card-body">
          <h2>Register</h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
            <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
            <button type="submit">Register</button>
          </form>
        </div> */}

    </div>
  )
}

export default Register