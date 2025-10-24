import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeTest = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Theme Test Page</h1>
      
      <div style={{ 
        padding: '20px', 
        marginBottom: '20px',
        backgroundColor: 'var(--card)',
        color: 'var(--text)',
        border: '2px solid var(--border)',
        borderRadius: '8px'
      }}>
        <h2>Current Theme: {theme}</h2>
        <p>Background: var(--bg) = {getComputedStyle(document.documentElement).getPropertyValue('--bg')}</p>
        <p>Card: var(--card) = {getComputedStyle(document.documentElement).getPropertyValue('--card')}</p>
        <p>Text: var(--text) = {getComputedStyle(document.documentElement).getPropertyValue('--text')}</p>
        <p>Primary: var(--primary) = {getComputedStyle(document.documentElement).getPropertyValue('--primary')}</p>
      </div>

      <div style={{ 
        padding: '20px', 
        marginBottom: '20px',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}>
        <h3>Document Root Attributes:</h3>
        <p>data-theme: {document.documentElement.getAttribute('data-theme')}</p>
        <p>class: {document.documentElement.className}</p>
      </div>

      <button 
        onClick={() => {
          console.log('Before toggle:', theme);
          toggleTheme();
          console.log('After toggle should be:', theme === 'dark' ? 'light' : 'dark');
        }}
        className="btn btn-primary"
        style={{ marginRight: '10px' }}
      >
        Toggle Theme (Current: {theme})
      </button>

      <button 
        onClick={() => {
          console.log('Current theme:', theme);
          console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
          console.log('class:', document.documentElement.className);
          console.log('CSS variables:', {
            bg: getComputedStyle(document.documentElement).getPropertyValue('--bg'),
            card: getComputedStyle(document.documentElement).getPropertyValue('--card'),
            text: getComputedStyle(document.documentElement).getPropertyValue('--text')
          });
        }}
        className="btn btn-secondary"
      >
        Log Current State
      </button>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--card)', borderRadius: '8px' }}>
        <h3>Test Elements</h3>
        <div className="stat-card" style={{ marginBottom: '10px' }}>
          <div className="stat-value">123</div>
          <div className="stat-label">Stat Card Test</div>
        </div>
        <button className="btn btn-success">Success Button</button>
        <button className="btn btn-danger" style={{ marginLeft: '10px' }}>Danger Button</button>
      </div>
    </div>
  );
};

export default ThemeTest;
