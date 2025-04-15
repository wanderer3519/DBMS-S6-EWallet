import React, { useState, useEffect } from 'react';
import { Container, Table, Badge } from 'react-bootstrap';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view your orders');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:8000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        setOrders(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.response?.data?.detail || 'Failed to fetch orders');
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <Container className="mt-4">Loading orders...</Container>;
  if (error) return <Container className="mt-4 text-danger">{error}</Container>;

  return (
    <Container className="mt-4">
      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>₹{order.total_amount.toFixed(2)}</td>
                <td>
                  <Badge bg={
                    order.status === 'completed' ? 'success' : 
                    order.status === 'pending' ? 'warning' :
                    'secondary'
                  }>
                    {order.status}
                  </Badge>
                </td>
                <td>
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.order_item_id}>
                        {item.quantity} x {item.name} (₹{item.price_at_time.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default Orders; 