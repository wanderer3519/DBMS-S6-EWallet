import React from 'react';
import { format } from 'date-fns';
import './RecentActivity.css';

const RecentActivity = ({ transactions }) => {

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'purchase':
                return { icon: 'fas fa-shopping-bag', color: 'danger' };
            case 'deposit':
                return { icon: 'fas fa-arrow-down', color: 'success' };
            case 'withdrawal':
                return { icon: 'fas fa-arrow-up', color: 'warning' };
            default:
                return { icon: 'fas fa-exchange-alt', color: 'info' };
        }
    };

    return (
        <div className="section-card recent-activity-card">
            <h3 className="section-title">Recent Activity</h3>
            <ul className="activity-list">
                {transactions.length > 0 ? (
                    transactions.map(tx => {
                        const { icon, color } = getTransactionIcon(tx.type);
                        return (
                            <li key={tx.id} className="activity-item">
                                <div className={`activity-icon icon-bg-${color}`}>
                                    <i className={icon}></i>
                                </div>
                                <div className="activity-details">
                                    <span className="activity-description">{tx.description}</span>
                                    <span className="activity-date">{format(new Date(tx.date), 'MMM d, yyyy')}</span>
                                </div>
                                <div className={`activity-amount text-${color}`}>
                                    {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                                </div>
                            </li>
                        );
                    })
                ) : (
                    <div className="empty-state">
                        <i className="fas fa-history empty-icon"></i>
                        <p>No recent transactions found.</p>
                    </div>
                )}
            </ul>
        </div>
    );
};

export default RecentActivity;
