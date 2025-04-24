# SQL Implementation of E-Wallet & Merchant Platform

This directory contains a pure SQL implementation of the E-Wallet & Merchant platform, converted from the original Python/SQLAlchemy ORM implementation.

## Overview

The original implementation relied on SQLAlchemy ORM to interact with the database. This new implementation uses raw SQL with stored procedures and functions to handle all database operations while maintaining the same functionality.

### Files Added/Modified:

1. `schema.sql` - SQL schema definitions for all tables
2. `db_connect.sql` - Database connection configuration
3. `user_procedures.sql` - SQL procedures for user operations
4. `account_procedures.sql` - SQL procedures for account operations
5. `product_procedures.sql` - SQL procedures for product and merchant operations
6. `cart_order_procedures.sql` - SQL procedures for cart and order operations
7. `admin_procedures.sql` - SQL procedures for admin operations
8. `init_db.sql` - Main SQL script to initialize the database
9. `sql_adapter.py` - Python adapter to connect the backend with the SQL implementation
10. `main_sql.py` - Modified version of main.py that uses the SQL implementation

## Setup Instructions

### 1. Set up the PostgreSQL Database

Ensure you have PostgreSQL installed and running. Then run the SQL initialization script:

```bash
psql -U postgres -f init_db.sql
```

This will:
- Create the `ewallet_db` database if it doesn't exist
- Apply all schema definitions 
- Create all stored procedures and functions
- Create an initial admin user

### 2. Set Environment Variables

Create a `.env` file with the following:

```
DATABASE_URL=postgresql://username:password@localhost:5432/ewallet_db
SECRET_KEY=your-secret-key
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Run the Application

To run the application with the SQL implementation:

```bash
python main_sql.py
```

## Switching Between ORM and SQL Implementations

You can switch between the original ORM implementation and the new SQL implementation:

- `main.py` - Original ORM implementation
- `main_sql.py` - New SQL implementation 

Both maintain the same API endpoints and functionality.

## API Endpoints

All API endpoints remain the same as in the original implementation. The SQL implementation preserves all functionality while using SQL stored procedures and functions under the hood.

## Differences From Original Implementation

1. **Database Interactions**:
   - Original: Uses SQLAlchemy ORM for database operations
   - New: Uses SQL stored procedures and functions 

2. **Transaction Management**:
   - Original: Relies on SQLAlchemy's session-based transaction management
   - New: Uses PostgreSQL's native transaction management

3. **Error Handling**:
   - Original: Combines Python and SQLAlchemy exceptions
   - New: Relies more on PostgreSQL's error handling mechanisms

## Database Structure

The database structure remains the same as in the original implementation:

- Users
- Account
- Transactions
- Refunds
- Logs
- RewardPoints
- Merchants
- Products
- Cart
- CartItems
- Orders
- OrderItems

## Benefits of SQL Implementation

1. **Performance**: Direct SQL execution can be more efficient than ORM for complex operations
2. **Encapsulation**: Business logic is encapsulated in database procedures
3. **Consistency**: Database constraints and triggers ensure data integrity
4. **Security**: Prepared statements prevent SQL injection
5. **Database Portability**: The SQL implementation can be used with any language or framework that can connect to PostgreSQL 