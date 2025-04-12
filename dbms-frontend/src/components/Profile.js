import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
    const { user, isAuthenticated, navigate } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!isAuthenticated || !user) {
                navigate('/login');
                return;
            }

            try {
                const response = await axios.get(`http://localhost:8000/users/${user.user_id}`, {
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`
                    }
                });
                setProfile(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching profile:', error);
                if (error.response?.status === 401) {
                    navigate('/login');
                } else {
                    setError('Failed to load profile. Please try again.');
                }
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate, user, isAuthenticated]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setError('New passwords do not match');
            return;
        }

        try {
            await axios.post('http://localhost:8000/user/change-password', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            }, {
                headers: { Authorization: `Bearer ${user.access_token}` }
            });

            setSuccess('Password changed successfully');
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to change password');
        }
    };

    const formatBalance = (balance) => {
        if (typeof balance !== 'number') return '0.00';
        return balance.toFixed(2);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Container className="mt-5">
            <h2 className="mb-4">My Profile</h2>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Card className="mb-4">
                <Card.Body>
                    <h3>Personal Information</h3>
                    <div className="profile-info">
                        <p><strong>Name:</strong> {profile?.full_name}</p>
                        <p><strong>Email:</strong> {profile?.email}</p>
                        <div className="profile-balance">
                            <h3>Account Balance</h3>
                            <p className="balance-amount">₹{formatBalance(profile?.accounts?.[0]?.balance)}</p>
                        </div>
                        <p><strong>Account Number:</strong> {profile?.accounts[0]?.account_number}</p>
                    </div>
                </Card.Body>
            </Card>

            <Card>
                <Card.Body>
                    <h3>Change Password</h3>
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.current_password}
                                onChange={(e) => setPasswordForm({
                                    ...passwordForm,
                                    current_password: e.target.value
                                })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.new_password}
                                onChange={(e) => setPasswordForm({
                                    ...passwordForm,
                                    new_password: e.target.value
                                })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={(e) => setPasswordForm({
                                    ...passwordForm,
                                    confirm_password: e.target.value
                                })}
                                required
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit">
                            Change Password
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Profile; 