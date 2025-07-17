-- ======================================================================
-- Account and Transaction Management Functions
-- ======================================================================

-- Function to create a new account for a user
CREATE OR REPLACE FUNCTION create_account(
    p_user_id INTEGER,
    p_account_type account_type DEFAULT 'user'
) RETURNS INTEGER AS $$
DECLARE
    new_account_id INTEGER;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;
    
    -- Create new account
    INSERT INTO account (user_id, account_type, balance, created_at)
    VALUES (p_user_id, p_account_type, 0.00, CURRENT_TIMESTAMP)
    RETURNING account_id INTO new_account_id;
    
    -- Log account creation
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'ACCOUNT_CREATED', 'New account created with type: ' || p_account_type);
    
    RETURN new_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user accounts
CREATE OR REPLACE FUNCTION get_user_accounts(p_user_id INTEGER)
RETURNS TABLE (
    account_id INTEGER,
    account_type account_type,
    balance DECIMAL(10,2),
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.account_id, a.account_type, a.balance, a.created_at
    FROM account a
    WHERE a.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to top up an account (add funds)
CREATE OR REPLACE FUNCTION top_up_account(
    p_account_id INTEGER,
    p_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50) DEFAULT 'online'
) RETURNS INTEGER AS $$
DECLARE
    user_id_var INTEGER;
    new_transaction_id INTEGER;
BEGIN
    -- Check if account exists
    IF NOT EXISTS (SELECT 1 FROM account WHERE account_id = p_account_id) THEN
        RAISE EXCEPTION 'Account with ID % does not exist', p_account_id;
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Top-up amount must be greater than zero';
    END IF;
    
    -- Get user_id for logging
    SELECT user_id INTO user_id_var FROM account WHERE account_id = p_account_id;
    
    -- Create transaction record
    INSERT INTO transactions (account_id, amount, transaction_type, status, created_at)
    VALUES (p_account_id, p_amount, 'top-up', 'completed', CURRENT_TIMESTAMP)
    RETURNING transaction_id INTO new_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance + p_amount
    WHERE account_id = p_account_id;
    
    -- Log the top-up
    INSERT INTO logs (user_id, action, description)
    VALUES (user_id_var, 'ACCOUNT_TOP_UP', 'Account topped up with ' || p_amount || ' via ' || p_payment_method);
    
    -- Grant reward points (1 point per 10 currency units)
    INSERT INTO reward_points (transaction_id, user_id, points, status, created_at)
    VALUES (new_transaction_id, user_id_var, FLOOR(p_amount / 10), 'earned', CURRENT_TIMESTAMP);
    
    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process a withdrawal
CREATE OR REPLACE FUNCTION process_withdrawal(
    p_account_id INTEGER,
    p_amount DECIMAL(10,2)
) RETURNS INTEGER AS $$
DECLARE
    user_id_var INTEGER;
    current_balance DECIMAL(10,2);
    new_transaction_id INTEGER;
BEGIN
    -- Check if account exists and get current balance
    SELECT user_id, balance INTO user_id_var, current_balance
    FROM account WHERE account_id = p_account_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account with ID % does not exist', p_account_id;
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
    END IF;
    
    -- Check if sufficient balance
    IF current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance for withdrawal';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (account_id, amount, transaction_type, status, created_at)
    VALUES (p_account_id, p_amount, 'withdrawal', 'completed', CURRENT_TIMESTAMP)
    RETURNING transaction_id INTO new_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance - p_amount
    WHERE account_id = p_account_id;
    
    -- Log the withdrawal
    INSERT INTO logs (user_id, action, description)
    VALUES (user_id_var, 'ACCOUNT_WITHDRAWAL', 'Withdrawal of ' || p_amount || ' processed');
    
    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get account transactions
CREATE OR REPLACE FUNCTION get_account_transactions(
    p_account_id INTEGER
) RETURNS TABLE (
    transaction_id INTEGER,
    amount DECIMAL(10,2),
    transaction_type transaction_type,
    status transaction_status,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.transaction_id, t.amount, t.transaction_type, t.status, t.created_at
    FROM transactions t
    WHERE t.account_id = p_account_id
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user reward points
CREATE OR REPLACE FUNCTION get_user_reward_points(
    p_user_id INTEGER
) RETURNS TABLE (
    total_earned INTEGER,
    total_redeemed INTEGER,
    available_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'earned' THEN points ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN status = 'redeemed' THEN points ELSE 0 END), 0) AS total_redeemed,
        COALESCE(SUM(CASE WHEN status = 'earned' THEN points 
                         WHEN status = 'redeemed' THEN -points
                         ELSE 0 END), 0) AS available_points
    FROM reward_points
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to redeem reward points
CREATE OR REPLACE FUNCTION redeem_reward_points(
    p_user_id INTEGER,
    p_points INTEGER
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    available_points INTEGER;
    account_id_var INTEGER;
    user_account_id INTEGER;
    cash_value DECIMAL(10,2);
    new_transaction_id INTEGER;
BEGIN
    -- Get available points
    SELECT available_points INTO available_points 
    FROM get_user_reward_points(p_user_id);
    
    -- Check if sufficient points available
    IF available_points < p_points THEN
        RAISE EXCEPTION 'Insufficient reward points. Available: %, Requested: %', 
                       available_points, p_points;
    END IF;
    
    -- Get user account
    SELECT account_id INTO user_account_id
    FROM account
    WHERE user_id = p_user_id AND account_type = 'user'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account found for user %', p_user_id;
    END IF;
    
    -- Calculate cash value (1 point = 0.1 currency units)
    cash_value := p_points * 0.1;
    
    -- Record redemption in reward points
    INSERT INTO reward_points (user_id, points, status, created_at)
    VALUES (p_user_id, p_points, 'redeemed', CURRENT_TIMESTAMP);
    
    -- Create transaction record
    INSERT INTO transactions (
        account_id, amount, transaction_type, status, created_at
    )
    VALUES (
        user_account_id, cash_value, 'reward_redemption', 'completed', CURRENT_TIMESTAMP
    )
    RETURNING transaction_id INTO new_transaction_id;
    
    -- Update account balance
    UPDATE account
    SET balance = balance + cash_value
    WHERE account_id = user_account_id;
    
    -- Log the redemption
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'REWARD_REDEEMED', 
            p_points || ' points redeemed for ' || cash_value || ' cash value');
    
    RETURN cash_value;
END;
$$ LANGUAGE plpgsql; 