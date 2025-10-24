import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 24 }}>
      <div className="app-container" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div className="d-flex justify-content-between align-items-center" style={{ color: 'var(--muted)' }}>
          <span>E-Wallet © {year}</span>
          <span>Built for coursework</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
