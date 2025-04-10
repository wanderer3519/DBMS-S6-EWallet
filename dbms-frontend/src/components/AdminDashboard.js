import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Row, Col, Form } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeMerchants: 0
    });
    const [dateFilter, setDateFilter] = useState('');
    const navigate = useNavigate();

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || user.role !== 'admin') {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://localhost:8000/admin/logs', {
                headers: { Authorization: `Bearer ${token}` },
                params: { date: dateFilter }
            });
            setLogs(response.data.logs);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:8000/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [dateFilter, navigate]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Container className="py-4">
            <h2 className="mb-4">Admin Dashboard</h2>

            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <Card.Title>Total Users</Card.Title>
                            <Card.Text className="h3">{stats.totalUsers}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <Card.Title>Total Orders</Card.Title>
                            <Card.Text className="h3">{stats.totalOrders}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <Card.Title>Total Revenue</Card.Title>
                            <Card.Text className="h3">₹{stats.totalRevenue}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center">
                        <Card.Body>
                            <Card.Title>Active Merchants</Card.Title>
                            <Card.Text className="h3">{stats.activeMerchants}</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <div className="mb-3">
                <Form.Group>
                    <Form.Label>Filter by Date</Form.Label>
                    <Form.Control
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </Form.Group>
            </div>

            <h3>System Logs</h3>
            <Table responsive striped>
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
                </tbody>
            </Table>
        </Container>
    );
};

export default AdminDashboard; 