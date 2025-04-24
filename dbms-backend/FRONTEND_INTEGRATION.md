# Frontend Integration Guide for SQL Implementation

This guide explains how to connect the React frontend to the SQL-based backend implementation.

## Overview

The SQL implementation of the backend provides the exact same API endpoints as the original ORM-based implementation. No changes to the frontend code are required. The frontend will continue to interact with the backend through the same API calls with the same request/response structures.

## Connection Steps

### 1. Start the SQL Backend

First, ensure the SQL backend is running:

```bash
# Navigate to the backend directory
cd DBMS-S6-EWallet-merchant/dbms-project

# Run the SQL implementation
chmod +x run_sql_api.sh  # Make the script executable (only needed once)
./run_sql_api.sh
```

The backend will start on http://localhost:8000 by default.

### 2. Configure the Frontend

No changes to the frontend configuration are required. The frontend is already configured to connect to the backend at http://localhost:8000, which is the same for both ORM and SQL implementations.

### 3. Start the Frontend

Navigate to the frontend directory and start the development server:

```bash
# Navigate to the frontend directory
cd DBMS-S6-EWallet-merchant/dbms-frontend

# Install dependencies (if not already installed)
npm install

# Start the development server
npm start
```

The frontend will be available at http://localhost:3000.

## Testing the Integration

To confirm the frontend is correctly connected to the SQL backend:

1. Log in to the application
2. Perform operations like viewing products, adding items to cart, or creating orders
3. Check the backend logs to see SQL queries being executed

If you experience any issues, check the browser console and the backend logs for error messages.

## API Endpoints

All API endpoints remain the same between the ORM and SQL implementations. Here are some key endpoints:

- Authentication: `/login`, `/signup`
- User Profile: `/api/account/profile`
- Products: `/products`, `/products/{product_id}`
- Cart: `/api/cart`, `/api/cart/add`
- Orders: `/api/orders`, `/orders/`

## Troubleshooting

If you encounter issues with the integration:

1. **Backend not responding**: 
   - Ensure the SQL backend is running
   - Check for error messages in the backend terminal
   - Verify database connection settings in `.env`

2. **Database connection failures**:
   - Ensure PostgreSQL is running
   - Verify credentials in `.env` file
   - Check if database tables were created properly

3. **API errors**:
   - Check browser console for error responses
   - Verify request format matches expected API structure
   - Look for validation errors in backend logs

4. **Missing data**:
   - Ensure database has been properly initialized with `init_db.sql`
   - Check if test data has been loaded (if applicable)

## Performance Considerations

The SQL implementation may have different performance characteristics compared to the ORM implementation:

- **Advantages**: Potentially faster for complex queries due to optimized stored procedures
- **Considerations**: Connection pooling and query caching may behave differently

For high-traffic production environments, consider implementing additional monitoring to compare performance between the two implementations. 