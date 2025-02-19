import Home from './components/Home';
import NoPage from './components/NoPage';
import Login from './components/Login';
import Register from './components/Register';
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

        <Route path='/home' element={
          <div className='container-fluid m-2'>
            <Home />
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
