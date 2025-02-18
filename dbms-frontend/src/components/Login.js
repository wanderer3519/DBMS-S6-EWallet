import React from 'react'
import { useState } from 'react';
import { Outlet, Link } from "react-router-dom";

const Login = () => {
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name] : value
        }));
    }

  return (
    <div className='card m-2'>
        

        <div className="card-body d-flex flex-column">
            <div>
                <strong> Username: </strong>
                <input type="text" class="form-control" placeholder="Your Username" aria-label="Username" aria-describedby="basic-addon1" value={formData.username} onChange={handleChange}/>
            </div>
            
            <div>
                <strong> Password: </strong>
                <input type="text" class="form-control" placeholder="Your Password" aria-label="Username" aria-describedby="basic-addon1" value={formData.password} onChange={handleChange}/>
            </div>
            

            <div>
                 <Link to="/register"> Not registered? Sign up </Link>
            </div>
        </div>

        <Outlet/>
    </div>
  )
}

export default Login