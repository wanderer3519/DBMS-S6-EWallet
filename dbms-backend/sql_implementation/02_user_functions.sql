-- ======================================================================
-- User Management Functions
-- ======================================================================

-- Function to create a new user
-- This function will handle creating a user with proper validation
CREATE OR REPLACE FUNCTION create_user(
    p_full_name VARCHAR(100),
    p_email VARCHAR(100),
    p_password_hash VARCHAR(255),
    p_role user_role DEFAULT 'customer',
    p_phone VARCHAR(12) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_user_id INTEGER;
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;
    
    -- Insert new user
    INSERT INTO users (full_name, email, password_hash, role, status, phone, created_at)
    VALUES (p_full_name, p_email, p_password_hash, p_role, 'active', p_phone, CURRENT_TIMESTAMP)
    RETURNING user_id INTO new_user_id;
    
    -- Log user creation
    INSERT INTO logs (user_id, action, description)
    VALUES (new_user_id, 'USER_CREATED', 'New user account created');
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify user credentials for login
CREATE OR REPLACE FUNCTION verify_user_credentials(
    p_email VARCHAR(100),
    p_password_hash VARCHAR(255)
) RETURNS TABLE (
    user_id INTEGER,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role user_role,
    status user_status
) AS $$
BEGIN
    -- Check if user exists and password is correct
    RETURN QUERY
    SELECT u.user_id, u.full_name, u.email, u.role, u.status
    FROM users u
    WHERE u.email = p_email 
    AND u.password_hash = p_password_hash;
    
    -- Log login attempt
    IF FOUND THEN
        INSERT INTO logs (user_id, action, description)
        VALUES ((SELECT user_id FROM users WHERE email = p_email), 'USER_LOGIN', 'User logged in successfully');
    ELSE
        -- Log failed login if user exists
        IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
            INSERT INTO logs (user_id, action, description)
            VALUES ((SELECT user_id FROM users WHERE email = p_email), 'LOGIN_FAILED', 'Login attempt failed');
        END IF;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id INTEGER,
    p_full_name VARCHAR(100) DEFAULT NULL,
    p_email VARCHAR(100) DEFAULT NULL,
    p_phone VARCHAR(12) DEFAULT NULL,
    p_profile_image VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_email VARCHAR(100);
BEGIN
    -- Get current email
    SELECT email INTO current_email FROM users WHERE user_id = p_user_id;
    
    -- Check if new email already exists for another user
    IF p_email IS NOT NULL AND p_email != current_email AND 
       EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email % is already in use by another account', p_email;
        RETURN FALSE;
    END IF;
    
    -- Update user profile with non-null values
    UPDATE users
    SET full_name = COALESCE(p_full_name, full_name),
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        profile_image = COALESCE(p_profile_image, profile_image)
    WHERE user_id = p_user_id;
    
    -- Log the update
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'PROFILE_UPDATED', 'User profile information updated');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to change user password
CREATE OR REPLACE FUNCTION change_user_password(
    p_user_id INTEGER,
    p_current_password_hash VARCHAR(255),
    p_new_password_hash VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists and current password is correct
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE user_id = p_user_id AND password_hash = p_current_password_hash
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update password
    UPDATE users
    SET password_hash = p_new_password_hash
    WHERE user_id = p_user_id;
    
    -- Log the password change
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'PASSWORD_CHANGED', 'User password has been updated');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to create a merchant account
CREATE OR REPLACE FUNCTION create_merchant(
    p_user_id INTEGER,
    p_business_name VARCHAR(100),
    p_business_category VARCHAR(50),
    p_name VARCHAR(100),
    p_email VARCHAR(100),
    p_contact VARCHAR(12) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_merchant_id INTEGER;
BEGIN
    -- Verify user exists and has merchant role
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;
    
    -- Make sure user is a merchant
    UPDATE users SET role = 'merchant' WHERE user_id = p_user_id;
    
    -- Create merchant record
    INSERT INTO merchants (
        user_id, business_name, business_category, 
        name, email, contact, created_at, updated_at
    )
    VALUES (
        p_user_id, p_business_name, p_business_category,
        p_name, p_email, p_contact, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING merchant_id INTO new_merchant_id;
    
    -- Log merchant creation
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'MERCHANT_CREATED', 'New merchant account created');
    
    RETURN new_merchant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user profile with accounts
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role user_role,
    status user_status,
    phone VARCHAR(12),
    profile_image VARCHAR(255),
    created_at TIMESTAMP,
    account_id INTEGER,
    account_type account_type,
    balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id, 
        u.full_name, 
        u.email, 
        u.role, 
        u.status, 
        u.phone, 
        u.profile_image, 
        u.created_at,
        a.account_id,
        a.account_type,
        a.balance
    FROM users u
    LEFT JOIN account a ON u.user_id = a.user_id
    WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql; 