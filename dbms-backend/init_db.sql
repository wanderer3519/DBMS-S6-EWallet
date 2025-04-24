-- init_db.sql - Initialize the database with all schemas and procedures

-- Check if database exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ewallet_db') THEN
        CREATE DATABASE ewallet_db;
    END IF;
END
$$;

-- Connect to the ewallet_db
\c ewallet_db;

-- Include schema definitions
\i schema.sql

-- Include all procedure files
\i db_connect.sql
\i user_procedures.sql
\i account_procedures.sql
\i product_procedures.sql
\i cart_order_procedures.sql
\i admin_procedures.sql

-- Create admin user if not exists
DO $$
DECLARE
    v_user_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
        CALL create_user(
            'Admin User',
            'admin@example.com',
            'admin123',
            'admin'::user_role,
            NULL,
            v_user_id
        );
        
        -- Log admin creation
        INSERT INTO logs (user_id, action, description, created_at)
        VALUES (v_user_id, 'ADMIN_CREATED', 'Initial admin user created', CURRENT_TIMESTAMP);
    END IF;
END
$$; 