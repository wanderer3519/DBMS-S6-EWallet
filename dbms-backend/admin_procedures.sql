-- admin_procedures.sql - SQL procedures for admin operations

-- Function to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_orders INTEGER,
    total_revenue DECIMAL(10,2),
    active_merchants INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_users,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS total_revenue,
        (SELECT COUNT(*) FROM merchants) AS active_merchants;
END;
$$ LANGUAGE plpgsql;

-- Function to get system logs
CREATE OR REPLACE FUNCTION get_admin_logs(
    p_action TEXT DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    log_id INTEGER,
    user_id INTEGER,
    user_email TEXT,
    user_role user_role,
    action TEXT,
    description TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.log_id,
        l.user_id,
        u.email,
        u.role,
        l.action,
        l.description,
        l.created_at
    FROM logs l
    JOIN users u ON l.user_id = u.user_id
    WHERE (p_action IS NULL OR l.action = p_action)
      AND (p_start_date IS NULL OR l.created_at >= p_start_date)
      AND (p_end_date IS NULL OR l.created_at <= p_end_date)
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all orders for admin
CREATE OR REPLACE FUNCTION get_admin_orders()
RETURNS TABLE (
    order_id INTEGER,
    user_id INTEGER,
    user_email TEXT,
    account_id INTEGER,
    total_amount DECIMAL(10,2),
    status order_status,
    payment_method TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id,
        o.user_id,
        u.email,
        o.account_id,
        o.total_amount,
        o.status,
        o.payment_method,
        o.created_at,
        o.updated_at
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Procedure to block/unblock user
CREATE OR REPLACE PROCEDURE update_user_status(
    p_user_id INTEGER,
    p_status user_status,
    p_admin_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update user status
    UPDATE users
    SET status = p_status
    WHERE user_id = p_user_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (
        p_admin_id, 
        'USER_STATUS_UPDATE', 
        'Updated user status to ' || p_status, 
        CURRENT_TIMESTAMP
    );
END;
$$;

-- Function to get merchant statistics for admin
CREATE OR REPLACE FUNCTION get_merchant_stats(p_merchant_id INTEGER)
RETURNS TABLE (
    total_products INTEGER,
    total_orders INTEGER,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM products WHERE merchant_id = p_merchant_id) AS total_products,
        (
            SELECT COUNT(DISTINCT oi.order_id)
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE p.merchant_id = p_merchant_id
        ) AS total_orders,
        (
            SELECT COALESCE(SUM(oi.price_at_time * oi.quantity), 0)
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE p.merchant_id = p_merchant_id
        ) AS total_revenue;
END;
$$ LANGUAGE plpgsql;

-- Function to get merchant logs
CREATE OR REPLACE FUNCTION get_merchant_logs(p_merchant_id INTEGER)
RETURNS TABLE (
    log_id INTEGER,
    action TEXT,
    description TEXT,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Get user ID for the merchant
    SELECT user_id INTO v_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Merchant not found';
    END IF;
    
    RETURN QUERY
    SELECT 
        l.log_id,
        l.action,
        l.description,
        l.created_at
    FROM logs l
    WHERE l.user_id = v_user_id
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get featured products (for homepage)
CREATE OR REPLACE FUNCTION get_featured_products(p_limit INTEGER DEFAULT 8)
RETURNS TABLE (
    product_id INTEGER,
    merchant_id INTEGER,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    stock INTEGER,
    business_category TEXT,
    image_url TEXT,
    status product_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id,
        p.merchant_id,
        p.name,
        p.description,
        p.price,
        p.mrp,
        p.stock,
        p.business_category,
        p.image_url,
        p.status,
        p.created_at,
        p.updated_at
    FROM products p
    WHERE p.status = 'active' AND p.stock > 0
    ORDER BY 
        -- Simple formula for featuring products:
        -- Newer products with bigger discounts get higher priority
        (p.mrp - p.price) / p.mrp * 100 + (1.0 / EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) * 10000000) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql; 