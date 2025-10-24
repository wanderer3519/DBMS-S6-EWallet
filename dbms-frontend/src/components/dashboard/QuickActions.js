import React from 'react';
import { Link } from 'react-router-dom';
import './QuickActions.css';

const QuickActions = () => {
    const actions = [
        { label: 'My Orders', icon: 'fas fa-receipt', path: '/orders', color: 'primary' },
        { label: 'Edit Profile', icon: 'fas fa-user-edit', path: '/profile', color: 'success' },
        { label: 'View Cart', icon: 'fas fa-shopping-cart', path: '/cart', color: 'warning' },
        { label: 'Browse Products', icon: 'fas fa-store', path: '/', color: 'info' },
    ];

    return (
        <div className="section-card quick-actions-card">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions-grid">
                {actions.map(action => (
                    <Link to={action.path} key={action.label} className={`action-button bg-gradient-${action.color}`}>
                        <i className={action.icon}></i>
                        <span>{action.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
