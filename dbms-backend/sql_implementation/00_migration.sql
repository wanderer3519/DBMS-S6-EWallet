-- ======================================================================
-- E-Wallet with Merchant Platform Complete Migration Script
-- ======================================================================

-- Run this script to set up the entire database schema with functions and triggers
-- Connect to your PostgreSQL database first

-- Drop existing schema if it exists (CAUTION: this will delete all data)
-- Comment out this section if you want to preserve existing data
DO $$
BEGIN
    -- Drop triggers first
    DROP TRIGGER IF EXISTS product_stock_update ON products;
    DROP TRIGGER IF EXISTS award_reward_points ON transactions;
    DROP TRIGGER IF EXISTS log_balance_changes ON account;
    DROP TRIGGER IF EXISTS log_order_status_changes ON orders;
    DROP TRIGGER IF EXISTS create_user_cart ON users;
    DROP TRIGGER IF EXISTS check_stock_levels ON cart_items;
    DROP TRIGGER IF EXISTS create_default_account ON users;
    DROP TRIGGER IF EXISTS record_refund_transaction ON refunds;
    DROP TRIGGER IF EXISTS log_transaction_status_changes ON transactions;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS update_product_status_trigger();
    DROP FUNCTION IF EXISTS award_reward_points_trigger();
    DROP FUNCTION IF EXISTS log_balance_changes_trigger();
    DROP FUNCTION IF EXISTS log_order_status_changes_trigger();
    DROP FUNCTION IF EXISTS create_user_cart_trigger();
    DROP FUNCTION IF EXISTS check_stock_levels_trigger();
    DROP FUNCTION IF EXISTS create_default_account_trigger();
    DROP FUNCTION IF EXISTS record_refund_transaction_trigger();
    DROP FUNCTION IF EXISTS log_transaction_status_changes_trigger();
    
    DROP FUNCTION IF EXISTS create_user(VARCHAR, VARCHAR, VARCHAR, user_role, VARCHAR);
    DROP FUNCTION IF EXISTS verify_user_credentials(VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS update_user_profile(INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS change_user_password(INTEGER, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS create_merchant(INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS get_user_profile(INTEGER);
    
    DROP FUNCTION IF EXISTS create_account(INTEGER, account_type);
    DROP FUNCTION IF EXISTS get_user_accounts(INTEGER);
    DROP FUNCTION IF EXISTS top_up_account(INTEGER, DECIMAL, VARCHAR);
    DROP FUNCTION IF EXISTS process_withdrawal(INTEGER, DECIMAL);
    DROP FUNCTION IF EXISTS get_account_transactions(INTEGER);
    DROP FUNCTION IF EXISTS get_user_reward_points(INTEGER);
    DROP FUNCTION IF EXISTS redeem_reward_points(INTEGER, INTEGER);
    
    DROP FUNCTION IF EXISTS create_product(INTEGER, VARCHAR, TEXT, DECIMAL, DECIMAL, INTEGER, VARCHAR, VARCHAR);
    DROP FUNCTION IF EXISTS update_product(INTEGER, INTEGER, VARCHAR, TEXT, DECIMAL, DECIMAL, INTEGER, VARCHAR, VARCHAR, product_status);
    DROP FUNCTION IF EXISTS delete_product(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS get_merchant_products(INTEGER);
    DROP FUNCTION IF EXISTS get_products_by_category(VARCHAR);
    DROP FUNCTION IF EXISTS get_merchant_stats(INTEGER);
    DROP FUNCTION IF EXISTS update_merchant_profile(INTEGER, VARCHAR, VARCHAR, VARCHAR);
    
    DROP FUNCTION IF EXISTS get_or_create_user_cart(INTEGER);
    DROP FUNCTION IF EXISTS add_to_cart(INTEGER, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS update_cart_item(INTEGER, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS remove_from_cart(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS get_cart_contents(INTEGER);
    DROP FUNCTION IF EXISTS create_order(INTEGER, INTEGER, VARCHAR, BOOLEAN, BOOLEAN, INTEGER);
    DROP FUNCTION IF EXISTS get_order_details(INTEGER);
    DROP FUNCTION IF EXISTS get_user_orders(INTEGER);
    
    DROP FUNCTION IF EXISTS get_admin_stats();
    DROP FUNCTION IF EXISTS get_filtered_logs(VARCHAR, TIMESTAMP, TIMESTAMP, INTEGER);
    DROP FUNCTION IF EXISTS get_merchant_logs(INTEGER);
    DROP FUNCTION IF EXISTS get_all_merchant_products();
    DROP FUNCTION IF EXISTS get_admin_orders();
    DROP FUNCTION IF EXISTS update_order_status(INTEGER, order_status);
    DROP FUNCTION IF EXISTS get_monthly_transaction_report(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS search_users(VARCHAR);
    DROP FUNCTION IF EXISTS search_products(VARCHAR);
    DROP FUNCTION IF EXISTS get_user_activity_report(INTEGER);
    
    -- Drop tables in correct order
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS cart;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS merchants;
    DROP TABLE IF EXISTS reward_points;
    DROP TABLE IF EXISTS logs;
    DROP TABLE IF EXISTS refunds;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS account;
    DROP TABLE IF EXISTS users;
    
    -- Drop custom types
    DROP TYPE IF EXISTS user_role;
    DROP TYPE IF EXISTS user_status;
    DROP TYPE IF EXISTS account_type;
    DROP TYPE IF EXISTS transaction_type;
    DROP TYPE IF EXISTS transaction_status;
    DROP TYPE IF EXISTS refund_status;
    DROP TYPE IF EXISTS reward_status;
    DROP TYPE IF EXISTS product_status;
    DROP TYPE IF EXISTS order_status;
END$$;

-- Now include all the SQL files in order

-- Create tables and base schema
\i '01_create_tables.sql'

-- Create user management functions
\i '02_user_functions.sql'

-- Create account and transaction functions
\i '03_account_functions.sql'

-- Create product management functions
\i '04_product_functions.sql'

-- Create cart and order functions
\i '05_cart_order_functions.sql'

-- Create triggers
\i '06_triggers.sql'

-- Create admin functions
\i '07_admin_functions.sql'

-- Verify successful migration
SELECT 'Migration completed successfully!' AS status; 