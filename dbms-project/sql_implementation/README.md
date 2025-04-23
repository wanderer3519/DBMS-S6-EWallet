# SQL Implementation for E-Wallet Merchant Platform

This directory contains a complete SQL implementation of the E-Wallet with Merchant Platform database. The implementation includes tables,
stored procedures (functions), and triggers that provide the core functionality of the application.

## Overview

The SQL implementation is organized into several files:

1. `00_migration.sql` - Main script to run all files in order
2. `01_create_tables.sql` - Database schema with tables and constraints
3. `02_user_functions.sql` - User management functions
4. `03_account_functions.sql` - Account and transaction functions
5. `04_product_functions.sql` - Product and merchant management functions
6. `05_cart_order_functions.sql` - Shopping cart and order processing functions
7. `06_triggers.sql` - Database triggers for automated operations
8. `07_admin_functions.sql` - Admin and reporting functions

## Functions and Triggers Implementation

### User Management Functions
- `create_user()` - Creates a new user with validation
- `verify_user_credentials()` - Verifies login credentials
- `update_user_profile()` - Updates user profile information
- `change_user_password()` - Changes user password with validation
- `create_merchant()` - Creates a merchant profile for a user
- `get_user_profile()` - Gets complete user profile with accounts

### Account Functions
- `create_account()` - Creates a new account for a user
- `get_user_accounts()` - Gets all accounts for a user
- `top_up_account()` - Adds funds to an account
- `process_withdrawal()` - Processes a withdrawal from an account
- `get_account_transactions()` - Gets all transactions for an account
- `get_user_reward_points()` - Gets reward points information for a user
- `redeem_reward_points()` - Redeems reward points for wallet balance

### Product Functions
- `create_product()` - Creates a new product
- `update_product()` - Updates product information
- `delete_product()` - Deletes a product
- `get_merchant_products()` - Gets all products for a merchant
- `get_products_by_category()` - Gets products filtered by category
- `get_merchant_stats()` - Gets sales statistics for a merchant
- `update_merchant_profile()` - Updates merchant profile information

### Cart and Order Functions
- `get_or_create_user_cart()` - Gets or creates a cart for a user
- `add_to_cart()` - Adds a product to a cart
- `update_cart_item()` - Updates quantity of a cart item
- `remove_from_cart()` - Removes a product from a cart
- `get_cart_contents()` - Gets cart contents with product details
- `create_order()` - Creates an order from cart contents
- `get_order_details()` - Gets complete order details with items
- `get_user_orders()` - Gets all orders for a user

### Admin Functions
- `get_admin_stats()` - Gets platform statistics for admin dashboard
- `get_filtered_logs()` - Gets filtered system logs
- `get_merchant_logs()` - Gets activity logs for a merchant
- `get_all_merchant_products()` - Gets all products from all merchants
- `get_admin_orders()` - Gets all orders for admin view
- `update_order_status()` - Updates an order's status
- `get_monthly_transaction_report()` - Gets monthly transaction report
- `search_users()` - Searches users by name or email
- `search_products()` - Searches products by name or description
- `get_user_activity_report()` - Gets activity report for a user

### Triggers
- `update_product_status_trigger()` - Updates product status based on stock
- `award_reward_points_trigger()` - Awards reward points for purchases
- `log_balance_changes_trigger()` - Logs account balance changes
- `log_order_status_changes_trigger()` - Logs order status changes
- `create_user_cart_trigger()` - Creates a cart for new users
- `check_stock_levels_trigger()` - Enforces stock availability in cart
- `create_default_account_trigger()` - Creates default account for new users
- `record_refund_transaction_trigger()` - Records transactions for refunds
- `log_transaction_status_changes_trigger()` - Logs transaction status changes

## How to Use

1. Create a PostgreSQL database for the application
2. Connect to the database using `psql` or another PostgreSQL client
3. Run the migration script:
   ```
   \i '00_migration.sql'
   ```
   
   Note: Ensure you're in the sql_implementation directory when running this command.

4. The database will be set up with all tables, functions, and triggers

## Function Examples

### Creating a User

```sql
SELECT create_user(
    'John Doe',
    'john@example.com',
    'hashed_password_here',
    'customer',
    '1234567890'
);
```

### Adding Funds to an Account

```sql
SELECT top_up_account(
    1,      -- account_id
    100.00, -- amount
    'card'  -- payment_method
);
```

### Creating a Product

```sql
SELECT create_product(
    1,                  -- merchant_id
    'Smartphone',       -- name
    'Latest model',     -- description
    499.99,             -- price
    599.99,             -- mrp
    100,                -- stock
    'Electronics',      -- business_category
    'uploads/phone.jpg' -- image_url
);
```

### Creating an Order

```sql
SELECT create_order(
    1,           -- user_id
    1,           -- account_id
    'wallet',    -- payment_method
    true,        -- use_wallet
    true,        -- use_rewards
    50           -- reward_points
);
```

## Data Flow

1. Users register accounts
2. Accounts are created automatically
3. Users add funds to their accounts
4. Merchants create products
5. Users browse products and add them to cart
6. Users create orders from their cart
7. System processes payment using wallet or other methods
8. Users earn reward points for purchases
9. Users can redeem reward points to their wallet
10. Admins can view reports and manage the platform

This SQL implementation completely replaces the need for complex application code by pushing the business logic into the database layer, making operations more efficient and maintaining data integrity. 