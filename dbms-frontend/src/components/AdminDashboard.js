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
    const [users, setUsers] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [searchMerchantTerm, setSearchMerchantTerm] = useState('');
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
                fetchUserLogins(),
                fetchOrders(),
                fetchStats(),
                fetchUsers(),
                fetchMerchants()
            ]);
            console.log('Dashboard data fetched successfully');
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load some dashboard data. Please try again.');
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

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching users...');
            const response = await axios.get('http://localhost:8000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    const fetchMerchants = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No auth token found');
            }
            
            console.log('Fetching merchants...');
            const response = await axios.get('http://localhost:8000/api/admin/merchants', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMerchants(response.data);
        } catch (error) {
            console.error('Error fetching merchants:', error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    const handleViewUser = (userId) => {
        navigate(`/admin/view-user/${userId}`);
    };

    const handleViewMerchant = (merchantId) => {
        navigate(`/admin/view-merchant/${merchantId}`);
    };

    const handleViewUserOrders = (userId) => {
        navigate(`/admin/view-user/${userId}/orders`);
    };

    const handleViewUserProfile = (userId) => {
        navigate(`/admin/view-user/${userId}/profile`);
    };

    const filteredUsers = searchUserTerm
        ? users.filter(user => 
            user.full_name.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
            user.user_id.toString().includes(searchUserTerm)
        )
        : users;

    const filteredMerchants = searchMerchantTerm
        ? merchants.filter(merchant => 
            merchant.business_name.toLowerCase().includes(searchMerchantTerm.toLowerCase()) ||
            merchant.email.toLowerCase().includes(searchMerchantTerm.toLowerCase()) ||
            merchant.merchant_id.toString().includes(searchMerchantTerm) ||
            merchant.business_category.toLowerCase().includes(searchMerchantTerm.toLowerCase())
        )
        : merchants;

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
                            <Nav.Item>
                                <Nav.Link eventKey="users">Users</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="merchants">Merchants</Nav.Link>
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
                                        {logs.map(log => (
                                            <tr key={log.log_id}>
                                                <td>{new Date(log.created_at).toLocaleString()}</td>
                                                <td>{log.user_name}</td>
                                                <td>
                                                    <Badge bg="info">{log.action}</Badge>
                                                </td>
                                                <td>{log.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Tab.Pane>
                            
                            <Tab.Pane eventKey="users">
                                <h4 className="mb-3">User Management</h4>
                                
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="Search users by name, email or ID..."
                                        value={searchUserTerm}
                                        onChange={(e) => setSearchUserTerm(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Balance</th>
                                            <th>Orders</th>
                                            <th>Created</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.user_id}>
                                                <td>{user.user_id}</td>
                                                <td>{user.full_name}</td>
                                                <td>{user.email}</td>
                                                <td>₹{user.balance.toFixed(2)}</td>
                                                <td>{user.order_count}</td>
                                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg={user.status === 'active' ? 'success' : 'secondary'}>
                                                        {user.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button 
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleViewUser(user.user_id)}
                                                            title="View user dashboard"
                                                        >
                                                            <i className="fas fa-user"></i> View As
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-info"
                                                            onClick={() => handleViewUserOrders(user.user_id)}
                                                            title="View user orders"
                                                        >
                                                            <i className="fas fa-shopping-bag"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleViewUserProfile(user.user_id)}
                                                            title="View user profile"
                                                        >
                                                            <i className="fas fa-id-card"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Tab.Pane>
                            
                            <Tab.Pane eventKey="merchants">
                                <h4 className="mb-3">Merchant Management</h4>
                                
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="Search merchants by name, email, category or ID..."
                                        value={searchMerchantTerm}
                                        onChange={(e) => setSearchMerchantTerm(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Business Name</th>
                                            <th>Category</th>
                                            <th>Email</th>
                                            <th>Contact</th>
                                            <th>Products</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMerchants.map(merchant => (
                                            <tr key={merchant.merchant_id}>
                                                <td>{merchant.merchant_id}</td>
                                                <td>{merchant.business_name}</td>
                                                <td>{merchant.business_category}</td>
                                                <td>{merchant.email}</td>
                                                <td>{merchant.contact}</td>
                                                <td>{merchant.product_count}</td>
                                                <td>{new Date(merchant.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleViewMerchant(merchant.merchant_id)}
                                                    >
                                                        <i className="fas fa-store"></i> View As
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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