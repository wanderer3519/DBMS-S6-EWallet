-- account_procedures.sql - SQL procedures for account operations

-- Procedure to create a new account
CREATE OR REPLACE PROCEDURE create_account(
    p_user_id INTEGER,
    p_account_type account_type DEFAULT 'user',
    INOUT p_account_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Create new account
    INSERT INTO account (
        user_id,
        account_type,
        balance,
        created_at
    ) VALUES (
        p_user_id,
        p_account_type,
        0.00,
        CURRENT_TIMESTAMP
    ) RETURNING account_id INTO p_account_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'ACCOUNT_CREATED', 'Created a new account', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get all accounts for a user
CREATE OR REPLACE FUNCTION get_user_accounts(p_user_id INTEGER)
RETURNS TABLE (
    account_id INTEGER,
    user_id INTEGER,
    account_type account_type,
    balance DECIMAL(10,2),
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.account_id,
        a.user_id,
        a.account_type,
        a.balance,
        a.created_at
    FROM account a
    WHERE a.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to add funds to an account (top-up)
CREATE OR REPLACE PROCEDURE top_up_account(
    p_account_id INTEGER,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT DEFAULT 'online',
    INOUT p_transaction_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Check if amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get user ID for the account
    SELECT user_id INTO v_user_id 
    FROM account 
    WHERE account_id = p_account_id;
    
    -- Check if account exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        account_id,
        amount,
        transaction_type,
        status,
        created_at
    ) VALUES (
        p_account_id,
        p_amount,
        'top-up',
        'completed',
        CURRENT_TIMESTAMP
    ) RETURNING transaction_id INTO p_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance + p_amount
    WHERE account_id = p_account_id;
    
    -- Add reward points (1 point per 10 currency units)
    INSERT INTO reward_points (
        transaction_id,
        user_id,
        points,
        status,
        created_at
    ) VALUES (
        p_transaction_id,
        v_user_id,
        FLOOR(p_amount / 10),
        'earned',
        CURRENT_TIMESTAMP
    );
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'TOP_UP', 'Added funds to account', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get total reward points for a user
CREATE OR REPLACE FUNCTION get_user_reward_points(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_available_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN status = 'earned' THEN points 
            WHEN status = 'redeemed' THEN -points
            ELSE 0
        END
    ), 0) INTO v_available_points
    FROM reward_points
    WHERE user_id = p_user_id;
    
    RETURN v_available_points;
END;
$$ LANGUAGE plpgsql;

-- Procedure to redeem reward points
CREATE OR REPLACE PROCEDURE redeem_reward_points(
    p_user_id INTEGER,
    p_points INTEGER,
    INOUT p_amount_credited DECIMAL(10,2) DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_points INTEGER;
    v_account_id INTEGER;
    v_transaction_id INTEGER;
BEGIN
    -- Get available points
    SELECT get_user_reward_points(p_user_id) INTO v_available_points;
    
    -- Check if user has enough points
    IF v_available_points < p_points THEN
        RAISE EXCEPTION 'Not enough reward points available';
    END IF;
    
    -- Get user's primary account
    SELECT account_id INTO v_account_id
    FROM account
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Check if user has an account
    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'User does not have an account';
    END IF;
    
    -- Calculate amount to credit (1 point = 0.1 currency units)
    p_amount_credited := p_points * 0.1;
    
    -- Create transaction for the credit
    INSERT INTO transactions (
        account_id,
        amount,
        transaction_type,
        status,
        created_at
    ) VALUES (
        v_account_id,
        p_amount_credited,
        'reward_redemption',
        'completed',
        CURRENT_TIMESTAMP
    ) RETURNING transaction_id INTO v_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance + p_amount_credited
    WHERE account_id = v_account_id;
    
    -- Record reward point redemption
    INSERT INTO reward_points (
        transaction_id,
        user_id,
        points,
        status,
        created_at
    ) VALUES (
        v_transaction_id,
        p_user_id,
        p_points,
        'redeemed',
        CURRENT_TIMESTAMP
    );
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'REDEEM_REWARDS', 'Redeemed reward points', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to withdraw funds
CREATE OR REPLACE PROCEDURE withdraw_funds(
    p_account_id INTEGER,
    p_amount DECIMAL(10,2),
    INOUT p_transaction_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
    v_balance DECIMAL(10,2);
BEGIN
    -- Check if amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get user ID and balance for the account
    SELECT a.user_id, a.balance INTO v_user_id, v_balance
    FROM account a
    WHERE a.account_id = p_account_id;
    
    -- Check if account exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Check if account has sufficient balance
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        account_id,
        amount,
        transaction_type,
        status,
        created_at
    ) VALUES (
        p_account_id,
        p_amount,
        'withdrawal',
        'completed',
        CURRENT_TIMESTAMP
    ) RETURNING transaction_id INTO p_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance - p_amount
    WHERE account_id = p_account_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (v_user_id, 'WITHDRAWAL', 'Withdrew funds from account', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get all transactions for an account
CREATE OR REPLACE FUNCTION get_account_transactions(p_account_id INTEGER)
RETURNS TABLE (
    transaction_id INTEGER,
    account_id INTEGER,
    amount DECIMAL(10,2),
    transaction_type transaction_type,
    status transaction_status,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.transaction_id,
        t.account_id,
        t.amount,
        t.transaction_type,
        t.status,
        t.created_at
    FROM transactions t
    WHERE t.account_id = p_account_id
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql; 