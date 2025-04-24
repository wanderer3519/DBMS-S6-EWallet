-- product_procedures.sql - SQL procedures for product and merchant operations

-- Procedure to create a merchant
CREATE OR REPLACE PROCEDURE create_merchant(
    p_user_id INTEGER,
    p_business_name TEXT,
    p_business_category TEXT,
    p_name TEXT,
    p_email TEXT,
    p_contact TEXT DEFAULT NULL,
    INOUT p_merchant_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if user already has a merchant account
    IF EXISTS (SELECT 1 FROM merchants WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User already has a merchant account';
    END IF;
    
    -- Create merchant
    INSERT INTO merchants (
        user_id,
        business_name,
        business_category,
        name,
        email,
        contact,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_business_name,
        p_business_category,
        p_name,
        p_email,
        p_contact,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING merchant_id INTO p_merchant_id;
    
    -- Update user role to merchant
    UPDATE users
    SET role = 'merchant'
    WHERE user_id = p_user_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'MERCHANT_CREATED', 'Created a merchant account', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get merchant profile
CREATE OR REPLACE FUNCTION get_merchant_profile(p_merchant_id INTEGER)
RETURNS TABLE (
    merchant_id INTEGER,
    user_id INTEGER,
    business_name TEXT,
    business_category TEXT,
    name TEXT,
    email TEXT,
    contact TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.merchant_id,
        m.user_id,
        m.business_name,
        m.business_category,
        m.name,
        m.email,
        m.contact,
        m.created_at,
        m.updated_at
    FROM merchants m
    WHERE m.merchant_id = p_merchant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get merchant by user_id
CREATE OR REPLACE FUNCTION get_merchant_by_user(p_user_id INTEGER)
RETURNS TABLE (
    merchant_id INTEGER,
    user_id INTEGER,
    business_name TEXT,
    business_category TEXT,
    name TEXT,
    email TEXT,
    contact TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.merchant_id,
        m.user_id,
        m.business_name,
        m.business_category,
        m.name,
        m.email,
        m.contact
    FROM merchants m
    WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to update merchant profile
CREATE OR REPLACE PROCEDURE update_merchant_profile(
    p_merchant_id INTEGER,
    p_business_name TEXT DEFAULT NULL,
    p_business_category TEXT DEFAULT NULL,
    p_contact TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Get user ID for the merchant
    SELECT user_id INTO v_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id;
    
    -- Check if merchant exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Merchant not found';
    END IF;
    
    -- Update merchant information
    UPDATE merchants
    SET 
        business_name = COALESCE(p_business_name, business_name),
        business_category = COALESCE(p_business_category, business_category),
        contact = COALESCE(p_contact, contact),
        updated_at = CURRENT_TIMESTAMP
    WHERE merchant_id = p_merchant_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'MERCHANT_UPDATED', 'Updated merchant profile', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to create a product
CREATE OR REPLACE PROCEDURE create_product(
    p_merchant_id INTEGER,
    p_name TEXT,
    p_description TEXT,
    p_price DECIMAL(10,2),
    p_mrp DECIMAL(10,2),
    p_stock INTEGER,
    p_business_category TEXT,
    p_image_url TEXT DEFAULT NULL,
    INOUT p_product_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Get user ID for the merchant
    SELECT user_id INTO v_user_id
    FROM merchants
    WHERE merchant_id = p_merchant_id;
    
    -- Check if merchant exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Merchant not found';
    END IF;
    
    -- Create product
    INSERT INTO products (
        merchant_id,
        name,
        description,
        price,
        mrp,
        stock,
        business_category,
        image_url,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_merchant_id,
        p_name,
        p_description,
        p_price,
        p_mrp,
        p_stock,
        p_business_category,
        p_image_url,
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING product_id INTO p_product_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'PRODUCT_CREATED', 'Created a new product', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get all products
CREATE OR REPLACE FUNCTION get_all_products(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
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
    WHERE p.status <> 'inactive'
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get a product by ID
CREATE OR REPLACE FUNCTION get_product_by_id(p_product_id INTEGER)
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
    WHERE p.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get products by merchant ID
CREATE OR REPLACE FUNCTION get_merchant_products(p_merchant_id INTEGER)
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
    WHERE p.merchant_id = p_merchant_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get products by category
CREATE OR REPLACE FUNCTION get_products_by_category(p_category TEXT)
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
    WHERE p.business_category = p_category
      AND p.status <> 'inactive'
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get distinct product categories
CREATE OR REPLACE FUNCTION get_product_categories()
RETURNS TABLE (category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.business_category
    FROM products p
    WHERE p.status <> 'inactive'
    ORDER BY p.business_category;
END;
$$ LANGUAGE plpgsql;

-- Procedure to update a product
CREATE OR REPLACE PROCEDURE update_product(
    p_product_id INTEGER,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price DECIMAL(10,2) DEFAULT NULL,
    p_mrp DECIMAL(10,2) DEFAULT NULL,
    p_stock INTEGER DEFAULT NULL,
    p_business_category TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_status product_status DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_merchant_id INTEGER;
    v_user_id INTEGER;
BEGIN
    -- Get merchant and user IDs for the product
    SELECT p.merchant_id, m.user_id INTO v_merchant_id, v_user_id
    FROM products p
    JOIN merchants m ON p.merchant_id = m.merchant_id
    WHERE p.product_id = p_product_id;
    
    -- Check if product exists
    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Update product information
    UPDATE products
    SET 
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        price = COALESCE(p_price, price),
        mrp = COALESCE(p_mrp, mrp),
        stock = COALESCE(p_stock, stock),
        business_category = COALESCE(p_business_category, business_category),
        image_url = COALESCE(p_image_url, image_url),
        status = COALESCE(p_status, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = p_product_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'PRODUCT_UPDATED', 'Updated product information', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to delete a product
CREATE OR REPLACE PROCEDURE delete_product(p_product_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_merchant_id INTEGER;
    v_user_id INTEGER;
BEGIN
    -- Get merchant and user IDs for the product
    SELECT p.merchant_id, m.user_id INTO v_merchant_id, v_user_id
    FROM products p
    JOIN merchants m ON p.merchant_id = m.merchant_id
    WHERE p.product_id = p_product_id;
    
    -- Check if product exists
    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Set product status to inactive (soft delete)
    UPDATE products
    SET 
        status = 'inactive',
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = p_product_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'PRODUCT_DELETED', 'Deleted product', CURRENT_TIMESTAMP);
END;
$$; 