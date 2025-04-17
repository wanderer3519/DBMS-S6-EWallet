import Dashboard from '../Dashboard';
import NoPage from '../NoPage';
import Login from '../Login';
import Register from '../Register';
import { BrowserRouter, Routes, Route } from 'react-router-dom';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className='container-fluid m-2'>
            <Login />
          </div>
        }/>

        <Route path='/dashboard' element={
          <div className='container-fluid m-2'>
            <Dashboard />
          </div>
        } />
        
        <Route path='/register' element={
          <div className='container-fluid m-2'>
            <Register />
          </div>
        } />
        
        <Route path="*" element={
          <div className='container-fluid m-2'>
            <NoPage />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
