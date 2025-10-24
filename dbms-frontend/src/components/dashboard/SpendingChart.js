import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './SpendingChart.css';

const SpendingChart = ({ transactions }) => {
    // Process data for the chart
    const data = transactions
        .filter(tx => tx.type === 'purchase')
        .reduce((acc, tx) => {
            const category = tx.description.split(' ')[0]; // Simple category extraction
            const existing = acc.find(item => item.name === category);
            if (existing) {
                existing.amount += Math.abs(tx.amount);
            } else {
                acc.push({ name: category, amount: Math.abs(tx.amount) });
            }
            return acc;
        }, []);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="label">{`${label}`}</p>
                    <p className="intro">{`Spent: $${payload[0].value.toFixed(2)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="section-card spending-chart-card">
            <h3 className="section-title">Spending Overview</h3>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(value) => `$${value}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }} />
                        <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="empty-state">
                    <i className="fas fa-chart-bar empty-icon"></i>
                    <p>No spending data available to display a chart.</p>
                </div>
            )}
        </div>
    );
};

export default SpendingChart;
