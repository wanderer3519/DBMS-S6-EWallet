-- ======================================================================
-- Product and Merchant Management Functions
-- ======================================================================

-- Function to create a new product
CREATE OR REPLACE FUNCTION create_product(
    p_merchant_id INTEGER,
    p_name VARCHAR(100),
    p_description TEXT,
    p_price DECIMAL(10,2),
    p_mrp DECIMAL(10,2),
    p_stock INTEGER,
    p_business_category VARCHAR(50),
    p_image_url VARCHAR(255)
) RETURNS INTEGER AS $$
DECLARE
    new_product_id INTEGER;
    merchant_user_id INTEGER;
BEGIN
    -- Check if merchant exists
    IF NOT EXISTS (
        SELECT 1 FROM merchants 
        WHERE merchant_id = p_merchant_id AND business_category = p_business_category
    ) THEN
        RAISE EXCEPTION 'Merchant with ID % and category % does not exist', 
                         p_merchant_id, p_business_category;
    END IF;
    
    -- Validate price and stock
    IF p_price <= 0 THEN
        RAISE EXCEPTION 'Product price must be greater than zero';
    END IF;
    
    IF p_stock < 0 THEN
        RAISE EXCEPTION 'Product stock cannot be negative';
    END IF;
    
    -- Get merchant's user_id for logging
    SELECT user_id INTO merchant_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id
    LIMIT 1;
    
    -- Insert new product
    INSERT INTO products (
        merchant_id, name, description, price, mrp, stock, 
        business_category, image_url, status, created_at, updated_at
    )
    VALUES (
        p_merchant_id, p_name, p_description, p_price, p_mrp, p_stock,
        p_business_category, p_image_url, 
        CASE WHEN p_stock > 0 THEN 'active' ELSE 'out_of_stock' END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING product_id INTO new_product_id;
    
    -- Log product creation
    INSERT INTO logs (user_id, action, description)
    VALUES (merchant_user_id, 'PRODUCT_CREATED', 'New product created: ' || p_name);
    
    RETURN new_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update a product
CREATE OR REPLACE FUNCTION update_product(
    p_product_id INTEGER,
    p_merchant_id INTEGER,
    p_name VARCHAR(100) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT NULL,
    p_mrp DECIMAL(10,2) DEFAULT NULL,
    p_stock INTEGER DEFAULT NULL,
    p_business_category VARCHAR(50) DEFAULT NULL,
    p_image_url VARCHAR(255) DEFAULT NULL,
    p_status product_status DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    product_merchant_id INTEGER;
    merchant_user_id INTEGER;
BEGIN
    -- Check if product exists and belongs to merchant
    SELECT merchant_id INTO product_merchant_id
    FROM products
    WHERE product_id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;
    
    IF product_merchant_id != p_merchant_id THEN
        RAISE EXCEPTION 'Product does not belong to merchant %', p_merchant_id;
    END IF;
    
    -- Get merchant's user_id for logging
    SELECT user_id INTO merchant_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id
    LIMIT 1;
    
    -- Update product with non-null values
    UPDATE products
    SET name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        price = COALESCE(p_price, price),
        mrp = COALESCE(p_mrp, mrp),
        stock = COALESCE(p_stock, stock),
        business_category = COALESCE(p_business_category, business_category),
        image_url = COALESCE(p_image_url, image_url),
        status = CASE 
                   WHEN p_status IS NOT NULL THEN p_status
                   WHEN p_stock IS NOT NULL AND p_stock <= 0 THEN 'out_of_stock'::product_status
                   WHEN p_stock IS NOT NULL AND p_stock > 0 THEN 'active'::product_status
                   ELSE status
                 END,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = p_product_id;
    
    -- Log product update
    INSERT INTO logs (user_id, action, description)
    VALUES (merchant_user_id, 'PRODUCT_UPDATED', 'Product updated: ' || p_product_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a product
CREATE OR REPLACE FUNCTION delete_product(
    p_product_id INTEGER,
    p_merchant_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    product_merchant_id INTEGER;
    merchant_user_id INTEGER;
    product_name VARCHAR(100);
BEGIN
    -- Check if product exists and belongs to merchant
    SELECT products.merchant_id, products.name INTO product_merchant_id, product_name
    FROM products
    WHERE product_id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;
    
    IF product_merchant_id != p_merchant_id THEN
        RAISE EXCEPTION 'Product does not belong to merchant %', p_merchant_id;
    END IF;
    
    -- Get merchant's user_id for logging
    SELECT user_id INTO merchant_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id
    LIMIT 1;
    
    -- Delete product
    DELETE FROM products
    WHERE product_id = p_product_id;
    
    -- Log product deletion
    INSERT INTO logs (user_id, action, description)
    VALUES (merchant_user_id, 'PRODUCT_DELETED', 'Product deleted: ' || product_name);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get merchant products
CREATE OR REPLACE FUNCTION get_merchant_products(
    p_merchant_id INTEGER
) RETURNS TABLE (
    product_id INTEGER,
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
        p.product_id, p.name, p.description, p.price, p.mrp, p.stock,
        p.business_category, p.image_url, p.status, p.created_at, p.updated_at
    FROM products p
    WHERE p.merchant_id = p_merchant_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get products by category
CREATE OR REPLACE FUNCTION get_products_by_category(
    p_category VARCHAR(50)
) RETURNS TABLE (
    product_id INTEGER,
    merchant_id INTEGER,
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
        p.product_id, p.merchant_id, p.name, p.description, 
        p.price, p.mrp, p.stock, p.business_category, 
        p.image_url, p.status, p.created_at, p.updated_at
    FROM products p
    WHERE p.business_category = p_category
    AND p.status = 'active'
    AND p.stock > 0
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get merchant information with stats
CREATE OR REPLACE FUNCTION get_merchant_stats(
    p_merchant_id INTEGER
) RETURNS TABLE (
    total_products INTEGER,
    total_sales INTEGER,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total products
        (SELECT COUNT(*) FROM products WHERE merchant_id = p_merchant_id),
        
        -- Total sales (count of order items with merchant's products)
        (SELECT COUNT(*) 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE p.merchant_id = p_merchant_id
         AND o.status = 'completed'),
         
        -- Total revenue
        (SELECT COALESCE(SUM(oi.price_at_time * oi.quantity), 0)
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE p.merchant_id = p_merchant_id
         AND o.status = 'completed');
END;
$$ LANGUAGE plpgsql;

-- Function to update merchant profile
CREATE OR REPLACE FUNCTION update_merchant_profile(
    p_merchant_id INTEGER,
    p_business_name VARCHAR(100) DEFAULT NULL,
    p_business_category VARCHAR(50) DEFAULT NULL,
    p_contact VARCHAR(12) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    merchant_user_id INTEGER;
BEGIN
    -- Check if merchant exists
    SELECT user_id INTO merchant_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Merchant with ID % does not exist', p_merchant_id;
    END IF;
    
    -- Update merchant profile with non-null values
    UPDATE merchants
    SET business_name = COALESCE(p_business_name, business_name),
        business_category = COALESCE(p_business_category, business_category),
        contact = COALESCE(p_contact, contact),
        updated_at = CURRENT_TIMESTAMP
    WHERE merchant_id = p_merchant_id;
    
    -- Log merchant profile update
    INSERT INTO logs (user_id, action, description)
    VALUES (merchant_user_id, 'MERCHANT_UPDATED', 'Merchant profile updated');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 