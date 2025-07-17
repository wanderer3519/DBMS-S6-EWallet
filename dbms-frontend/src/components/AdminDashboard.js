import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Row, Col, Form, Nav, Tab, Badge, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [userLogins, setUserLogins] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeMerchants: 0
    });
    const [dateFilter, setDateFilter] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();

    useEffect(() => {
        console.log('Admin Dashboard: Current user:', user);
        
        // Add a small delay to ensure we have latest auth state
        const checkAuth = setTimeout(() => {
            // Check if user is logged in
            if (!user) {
                console.log('No user found, redirecting to admin login');
                navigate('/admin/login');
                return;
            }
            
            // Check if user is admin
            if (user.role !== 'admin') {
                console.log('User is not admin, redirecting to login', user);
                navigate('/login');
                return;
            }
            
            console.log('Admin user authenticated, fetching dashboard data');
            fetchData();
        }, 300);
        
        return () => clearTimeout(checkAuth);
    }, [user, navigate]);
    
    // Effect for date filter changes
    useEffect(() => {
        if (user && user.role === 'admin' && !loading) {
            fetchLogs();
            fetchUserLogins();
        }
    }, [dateFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchLogs(),
                fetchStats(),
                fetchUserLogins(),
                fetchOrders()
            ]);
            console.log('Dashboard data fetched successfully');
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching logs...');
            const response = await axios.get('http://localhost:8000/admin/logs', {
                headers: { Authorization: `Bearer ${token}` },
                params: { date: dateFilter }
            });
            
            console.log('Logs response:', response.data);
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    const fetchUserLogins = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching user logins...');
            const response = await axios.get('http://localhost:8000/api/admin/logs', {
                headers: { Authorization: `Bearer ${token}` },
                params: { action: 'user_login', date: dateFilter }
            });
            
            console.log('User logins response:', response.data);
            setUserLogins(response.data.logs || []);
        } catch (error) {
            console.error('Error fetching user logins:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching orders...');
            const response = await axios.get('http://localhost:8000/api/admin/orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Orders response:', response.data);
            setOrders(response.data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching stats...');
            const response = await axios.get('http://localhost:8000/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Stats response:', response.data);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    // Initial loading state before we verify the user role
    if (!user) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <Spinner animation="border" variant="primary" />
                <span className="ms-2">Checking authentication...</span>
            </Container>
        );
    }

    // Check if the user has the admin role
    if (user.role !== 'admin') {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    You need admin privileges to access this page. Redirecting to login...
                </Alert>
            </Container>
        );
    }

    // Show loading state if we're still loading dashboard data
    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <h3 className="mt-3">Loading dashboard data...</h3>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h2 className="mb-4">Admin Dashboard</h2>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Tab.Container id="admin-tabs" activeKey={activeTab} onSelect={setActiveTab}>
                <Row>
                    <Col md={3}>
                        <Nav variant="pills" className="flex-column mb-4">
                            <Nav.Item>
                                <Nav.Link eventKey="overview">Overview</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="userActivity">User Activity</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="orders">Orders</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="systemLogs">System Logs</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Col>
                    <Col md={9}>
                        <Tab.Content>
                            <Tab.Pane eventKey="overview">
                                <Row className="mb-4">
                                    <Col md={6} lg={3} className="mb-3">
                                        <Card className="text-center h-100 shadow-sm">
                                            <Card.Body>
                                                <Card.Title>Total Users</Card.Title>
                                                <Card.Text className="h3">{stats.totalUsers || 0}</Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6} lg={3} className="mb-3">
                                        <Card className="text-center h-100 shadow-sm">
                                            <Card.Body>
                                                <Card.Title>Total Orders</Card.Title>
                                                <Card.Text className="h3">{stats.totalOrders || 0}</Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6} lg={3} className="mb-3">
                                        <Card className="text-center h-100 shadow-sm">
                                            <Card.Body>
                                                <Card.Title>Total Revenue</Card.Title>
                                                <Card.Text className="h3">₹{stats.totalRevenue || 0}</Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6} lg={3} className="mb-3">
                                        <Card className="text-center h-100 shadow-sm">
                                            <Card.Body>
                                                <Card.Title>Active Merchants</Card.Title>
                                                <Card.Text className="h3">{stats.activeMerchants || 0}</Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                                
                                <h4 className="mb-3">Recent Activity</h4>
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>User</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.slice(0, 5).map((log) => (
                                            <tr key={log.log_id}>
                                                <td>{new Date(log.created_at).toLocaleString()}</td>
                                                <td>{log.user_name}</td>
                                                <td>{log.action}</td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="text-center">No recent activity</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Tab.Pane>

                            <Tab.Pane eventKey="userActivity">
                                <h4 className="mb-3">User Login Activity</h4>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>Filter by Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>User</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userLogins.map((login) => (
                                            <tr key={login.log_id}>
                                                <td>{new Date(login.created_at).toLocaleString()}</td>
                                                <td>{login.user_name}</td>
                                                <td>{login.user_email}</td>
                                                <td>
                                                    <Badge bg={
                                                        login.user_role === 'admin' ? 'danger' :
                                                        login.user_role === 'merchant' ? 'primary' : 'success'
                                                    }>
                                                        {login.user_role}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                        {userLogins.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center">No login activity found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Tab.Pane>

                            <Tab.Pane eventKey="orders">
                                <h4 className="mb-3">Recent Orders</h4>
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>User</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.order_id}>
                                                <td>{order.order_id}</td>
                                                <td>{order.user_name}</td>
                                                <td>₹{order.total_amount}</td>
                                                <td>
                                                    <Badge bg={
                                                        order.status === 'completed' ? 'success' :
                                                        order.status === 'processing' ? 'warning' :
                                                        order.status === 'cancelled' ? 'danger' : 'info'
                                                    }>
                                                        {order.status}
                                                    </Badge>
                                                </td>
                                                <td>{new Date(order.created_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center">No orders found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Tab.Pane>

                            <Tab.Pane eventKey="systemLogs">
                                <h4 className="mb-3">System Logs</h4>
                                <Form.Group className="mb-3">
                                    <Form.Label>Filter by Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log.log_id}>
                                                <td>{new Date(log.created_at).toLocaleString()}</td>
                                                <td>{log.user_name}</td>
                                                <td>{log.action}</td>
                                                <td>{log.description}</td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center">No logs found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Tab.Pane>
                        </Tab.Content>
                    </Col>
                </Row>
            </Tab.Container>
        </Container>
    );
};

export default AdminDashboard;