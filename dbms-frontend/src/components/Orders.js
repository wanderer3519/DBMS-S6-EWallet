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
        const response = await axios.get('/api/orders');
        setOrders(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch orders');
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
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>₹{order.total_amount.toFixed(2)}</td>
              <td>
                <Badge bg={order.status === 'completed' ? 'success' : 'warning'}>
                  {order.status}
                </Badge>
              </td>
              <td>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity} x {item.product.name} (₹{item.price.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default Orders; 