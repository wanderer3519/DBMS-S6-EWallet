import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Page from '../shared/Page';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import './OrderHistory.css';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);

    const API_BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/order/user/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(response.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch orders. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': { class: 'warning', icon: 'fas fa-clock' },
            'processing': { class: 'info', icon: 'fas fa-spinner' },
            'shipped': { class: 'primary', icon: 'fas fa-shipping-fast' },
            'delivered': { class: 'success', icon: 'fas fa-check-circle' },
            'cancelled': { class: 'danger', icon: 'fas fa-times-circle' }
        };
        
        const config = statusConfig[status?.toLowerCase()] || statusConfig['pending'];
        
        return (
            <span className={`badge bg-${config.class}`}>
                <i className={`${config.icon} me-1`}></i>
                {status || 'Pending'}
            </span>
        );
    };

    if (loading) {
        return (
            <Page title="My Orders" icon="fas fa-receipt" backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}>
                <LoadingSkeleton height="200px" />
                <LoadingSkeleton height="200px" className="mt-3" />
            </Page>
        );
    }

    if (error) {
        return (
            <Page title="My Orders" icon="fas fa-receipt" backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}>
                <div className="alert alert-danger">{error}</div>
            </Page>
        );
    }

    const stats = [
        { label: 'Total Orders', value: orders.length, icon: 'fas fa-receipt', color: 'primary' },
        { label: 'Total Spent', value: `$${orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}`, icon: 'fas fa-dollar-sign', color: 'success' }
    ];

    return (
        <Page
            title="My Orders"
            subtitle="View and track your order history"
            icon="fas fa-receipt"
            breadcrumbs={[
                { name: 'Home', path: '/' },
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Orders' }
            ]}
            backButton={{ path: '/dashboard', label: 'Back to Dashboard' }}
            stats={stats}
        >
            {orders.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-receipt empty-icon"></i>
                    <h3>No orders yet</h3>
                    <p>Start shopping to see your orders here!</p>
                    <button className="btn btn-primary mt-3" onClick={() => window.location.href = '/'}>
                        <i className="fas fa-shopping-bag me-2"></i>
                        Browse Products
                    </button>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order.order_id} className="section-card order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h4>Order #{order.order_id}</h4>
                                    <p className="order-date">
                                        <i className="fas fa-calendar me-2"></i>
                                        {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                                <div className="order-status">
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="detail-row">
                                    <span className="label">Payment Method:</span>
                                    <span className="value">{order.payment_method || 'N/A'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Items:</span>
                                    <span className="value">{order.items?.length || 0} item(s)</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Subtotal:</span>
                                    <span className="value">${(order.total_amount - (order.reward_discount || 0)).toFixed(2)}</span>
                                </div>
                                {order.reward_discount > 0 && (
                                    <div className="detail-row reward">
                                        <span className="label">
                                            <i className="fas fa-star me-1"></i>
                                            Rewards Discount:
                                        </span>
                                        <span className="value">-${order.reward_discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="detail-row total">
                                    <span className="label">Total:</span>
                                    <span className="value">${order.total_amount.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                className="btn-toggle-items"
                                onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}
                            >
                                {expandedOrder === order.order_id ? (
                                    <>
                                        <i className="fas fa-chevron-up me-2"></i>
                                        Hide Items
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-chevron-down me-2"></i>
                                        View Items ({order.items?.length || 0})
                                    </>
                                )}
                            </button>

                            {expandedOrder === order.order_id && order.items && (
                                <div className="order-items">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="order-item">
                                            <div className="item-name">{item.product_name}</div>
                                            <div className="item-quantity">Qty: {item.quantity}</div>
                                            <div className="item-price">${item.price.toFixed(2)}</div>
                                            <div className="item-total">${(item.price * item.quantity).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Page>
    );
};

export default OrderHistory;
