-- ======================================================================
-- Admin and Reporting Functions
-- ======================================================================

-- Function to get admin dashboard statistics
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
        -- Total users
        (SELECT COUNT(*) FROM users WHERE role = 'customer'),
        
        -- Total orders
        (SELECT COUNT(*) FROM orders),
        
        -- Total revenue (sum of completed orders)
        (SELECT COALESCE(SUM(total_amount), 0) 
         FROM orders 
         WHERE status = 'completed'),
         
        -- Active merchants
        (SELECT COUNT(*) FROM merchants m
         JOIN users u ON m.user_id = u.user_id
         WHERE u.status = 'active' AND u.role = 'merchant');
END;
$$ LANGUAGE plpgsql;

-- Function to get logs with filtering
CREATE OR REPLACE FUNCTION get_filtered_logs(
    p_action VARCHAR(100) DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL
) RETURNS TABLE (
    log_id INTEGER,
    user_id INTEGER,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    action VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.log_id,
        l.user_id,
        u.full_name,
        u.email,
        l.action,
        l.description,
        l.created_at
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.user_id
    WHERE (p_action IS NULL OR l.action = p_action)
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date)
    AND (p_user_id IS NULL OR l.user_id = p_user_id)
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get merchant logs
CREATE OR REPLACE FUNCTION get_merchant_logs(
    p_merchant_id INTEGER
) RETURNS TABLE (
    log_id INTEGER,
    action VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP
) AS $$
DECLARE
    merchant_user_id INTEGER;
BEGIN
    -- Get merchant's user_id
    SELECT user_id INTO merchant_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Merchant with ID % not found', p_merchant_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        l.log_id,
        l.action,
        l.description,
        l.created_at
    FROM logs l
    WHERE l.user_id = merchant_user_id
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all merchant products for admin
CREATE OR REPLACE FUNCTION get_all_merchant_products()
RETURNS TABLE (
    product_id INTEGER,
    merchant_id INTEGER,
    merchant_name VARCHAR(100),
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    stock INTEGER,
    business_category VARCHAR(50),
    image_url VARCHAR(255),
    status product_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id, 
        p.merchant_id,
        m.business_name,
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
    JOIN merchants m ON p.merchant_id = m.merchant_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all orders for admin
CREATE OR REPLACE FUNCTION get_admin_orders()
RETURNS TABLE (
    order_id INTEGER,
    user_id INTEGER,
    user_name VARCHAR(100),
    total_amount DECIMAL(10,2),
    status order_status,
    payment_method VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    items_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id,
        o.user_id,
        u.full_name,
        o.total_amount,
        o.status,
        o.payment_method,
        o.created_at,
        o.updated_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id)
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update order status (for admin)
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id INTEGER,
    p_status order_status
) RETURNS BOOLEAN AS $$
DECLARE
    order_user_id INTEGER;
BEGIN
    -- Get order's user_id
    SELECT user_id INTO order_user_id
    FROM orders
    WHERE order_id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order with ID % not found', p_order_id;
    END IF;
    
    -- Update order status
    UPDATE orders
    SET status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id;
    
    -- If order is cancelled, restore product stock
    IF p_status = 'cancelled' THEN
        -- Restore stock for order items
        UPDATE products p
        SET stock = p.stock + oi.quantity,
            status = CASE 
                       WHEN p.stock + oi.quantity > 0 AND p.status = 'out_of_stock' 
                       THEN 'active'::product_status
                       ELSE p.status 
                     END
        FROM order_items oi
        WHERE oi.order_id = p_order_id
        AND p.product_id = oi.product_id;
    END IF;
    
    -- Log order status update
    INSERT INTO logs (action, description)
    VALUES ('ADMIN_ORDER_UPDATE', 'Admin updated order #' || p_order_id || ' status to ' || p_status);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly transaction report
CREATE OR REPLACE FUNCTION get_monthly_transaction_report(
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
) RETURNS TABLE (
    transaction_type transaction_type,
    total_count INTEGER,
    total_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.transaction_type,
        COUNT(*) AS total_count,
        SUM(t.amount) AS total_amount
    FROM transactions t
    WHERE EXTRACT(YEAR FROM t.created_at) = p_year
    AND EXTRACT(MONTH FROM t.created_at) = p_month
    AND t.status = 'completed'
    GROUP BY t.transaction_type
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search users (for admin)
CREATE OR REPLACE FUNCTION search_users(
    p_search_term VARCHAR(100)
) RETURNS TABLE (
    user_id INTEGER,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role user_role,
    status user_status,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.role,
        u.status,
        u.created_at
    FROM users u
    WHERE u.full_name ILIKE '%' || p_search_term || '%'
    OR u.email ILIKE '%' || p_search_term || '%'
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search products (for admin)
CREATE OR REPLACE FUNCTION search_products(
    p_search_term VARCHAR(100)
) RETURNS TABLE (
    product_id INTEGER,
    merchant_id INTEGER,
    merchant_name VARCHAR(100),
    name VARCHAR(100),
    price DECIMAL(10,2),
    stock INTEGER,
    business_category VARCHAR(50),
    status product_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id,
        p.merchant_id,
        m.business_name,
        p.name,
        p.price,
        p.stock,
        p.business_category,
        p.status
    FROM products p
    JOIN merchants m ON p.merchant_id = m.merchant_id
    WHERE p.name ILIKE '%' || p_search_term || '%'
    OR p.description ILIKE '%' || p_search_term || '%'
    OR p.business_category ILIKE '%' || p_search_term || '%'
    OR m.business_name ILIKE '%' || p_search_term || '%'
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity report
CREATE OR REPLACE FUNCTION get_user_activity_report(
    p_user_id INTEGER
) RETURNS TABLE (
    action VARCHAR(100),
    count INTEGER,
    last_activity TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.action,
        COUNT(*) AS count,
        MAX(l.created_at) AS last_activity
    FROM logs l
    WHERE l.user_id = p_user_id
    GROUP BY l.action
    ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql; 