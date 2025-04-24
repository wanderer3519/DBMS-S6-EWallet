-- user_procedures.sql - SQL procedures for user operations

-- Function to hash a password (simple representation, use proper crypto functions in production)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to verify a password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, stored_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex') = stored_hash;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create a new user
CREATE OR REPLACE PROCEDURE create_user(
    p_full_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role user_role DEFAULT 'customer',
    p_phone TEXT DEFAULT NULL,
    INOUT p_user_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Insert the new user
    INSERT INTO users (
        full_name, 
        email, 
        password_hash, 
        role, 
        status, 
        phone, 
        created_at
    ) VALUES (
        p_full_name,
        p_email,
        hash_password(p_password),
        p_role,
        'active',
        p_phone,
        CURRENT_TIMESTAMP
    ) RETURNING user_id INTO p_user_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'SIGNUP', 'User created an account', CURRENT_TIMESTAMP);
END;
$$;

-- Function to authenticate a user and return user details
CREATE OR REPLACE FUNCTION authenticate_user(
    p_email TEXT,
    p_password TEXT
) 
RETURNS TABLE (
    user_id INTEGER,
    email TEXT,
    full_name TEXT,
    role user_role,
    status user_status
) AS $$
DECLARE
    v_user_id INTEGER;
    v_password_hash TEXT;
    v_status user_status;
BEGIN
    -- Get user from database
    SELECT u.user_id, u.password_hash, u.status 
    INTO v_user_id, v_password_hash, v_status
    FROM users u
    WHERE u.email = p_email;
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Check if user is blocked
    IF v_status = 'blocked' THEN
        RAISE EXCEPTION 'Account is blocked';
    END IF;
    
    -- Verify password
    IF NOT verify_password(p_password, v_password_hash) THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Return user details
    RETURN QUERY 
    SELECT u.user_id, u.email, u.full_name, u.role, u.status
    FROM users u 
    WHERE u.user_id = v_user_id;
    
    -- Create login log
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'LOGIN', 'User logged in', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Procedure to update user profile
CREATE OR REPLACE PROCEDURE update_user_profile(
    p_user_id INTEGER,
    p_full_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update user information
    UPDATE users
    SET 
        full_name = COALESCE(p_full_name, full_name),
        email = COALESCE(p_email, email),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'PROFILE_UPDATE', 'User updated profile', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to change password
CREATE OR REPLACE PROCEDURE change_password(
    p_user_id INTEGER,
    p_current_password TEXT,
    p_new_password TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_password_hash TEXT;
BEGIN
    -- Get current password hash
    SELECT password_hash INTO v_password_hash
    FROM users
    WHERE user_id = p_user_id;
    
    -- Verify current password
    IF NOT verify_password(p_current_password, v_password_hash) THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;
    
    -- Update password
    UPDATE users
    SET password_hash = hash_password(p_new_password)
    WHERE user_id = p_user_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'PASSWORD_CHANGE', 'User changed password', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get user profile with accounts
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    full_name TEXT,
    email TEXT,
    role user_role,
    status user_status,
    created_at TIMESTAMP,
    phone TEXT,
    profile_image TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.phone,
        u.profile_image
    FROM users u
    WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql; 