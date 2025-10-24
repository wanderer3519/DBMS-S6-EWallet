import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Page from '../shared/Page';
import axios from 'axios';
import './UserDashboard.css';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import SpendingChart from './SpendingChart';

const UserDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://localhost:8000/api/user/dashboard');
                setData(response.data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch dashboard data. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Page 
                title="Loading Dashboard..."
                icon="fas fa-spinner fa-spin"
            >
                <div className="dashboard-grid">
                    <LoadingSkeleton height="150px" />
                    <LoadingSkeleton height="300px" />
                </div>
            </Page>
        );
    }

    if (error) {
        return (
            <Page title="Error" icon="fas fa-exclamation-triangle">
                <div className="alert alert-danger">{error}</div>
            </Page>
        );
    }

    const stats = [
        { label: 'Wallet Balance', value: `$${data?.accountBalance.toFixed(2) || '0.00'}`, icon: 'fas fa-wallet', color: 'primary' },
        { label: 'Total Transactions', value: data?.recentTransactions.length || 0, icon: 'fas fa-exchange-alt', color: 'success' },
        { label: 'Rewards Points', value: data?.rewardsPoints.toLocaleString() || 0, icon: 'fas fa-star', color: 'warning' }
    ];

    return (
        <Page 
            title={`Welcome, ${data?.userInfo.full_name || user?.full_name || 'User'}!`}
            subtitle="This is your mission control. Everything you need is right here."
            icon="fas fa-tachometer-alt"
            breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Dashboard' }]}
            stats={stats}
        >
            <div className="dashboard-grid">
                <QuickActions />
                <RecentActivity transactions={data?.recentTransactions || []} />
                <SpendingChart transactions={data?.recentTransactions || []} />
            </div>
        </Page>
    );
};

export default UserDashboard;
