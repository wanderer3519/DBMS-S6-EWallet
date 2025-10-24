import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import Navbar from '../routes/Navbar';
import Footer from './Footer';

const AppLayout = () => {
  return (
    <div className="app-root">
      <Navbar />
      <main className="app-page">
        <Container className="app-container">
          <Outlet />
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
