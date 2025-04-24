-- ======================================================================
-- Triggers for Database Operations
-- ======================================================================

-- Trigger to automatically update product status based on stock
CREATE OR REPLACE FUNCTION update_product_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on stock level
    IF NEW.stock <= 0 THEN
        NEW.status = 'out_of_stock';
    ELSE IF NEW.status = 'out_of_stock' AND NEW.stock > 0 THEN
        NEW.status = 'active';
    END IF;
    
    -- Update the timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_stock_update
BEFORE UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_status_trigger();

-- Trigger to award reward points for purchases
CREATE OR REPLACE FUNCTION award_reward_points_trigger()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
    user_id_var INTEGER;
BEGIN
    -- Only award points for completed purchase transactions
    IF NEW.transaction_type = 'purchase' AND NEW.status = 'completed' THEN
        -- Calculate points (1 point per 10 currency units spent)
        points_to_award := FLOOR(NEW.amount / 10);
        
        -- Get user_id from the account
        SELECT user_id INTO user_id_var
        FROM account
        WHERE account_id = NEW.account_id;
        
        -- Award points if above zero
        IF points_to_award > 0 THEN
            INSERT INTO reward_points (
                transaction_id, user_id, points, status, created_at
            )
            VALUES (
                NEW.transaction_id, user_id_var, points_to_award, 'earned', CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_reward_points
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION award_reward_points_trigger();

-- Trigger to log account balance changes
CREATE OR REPLACE FUNCTION log_balance_changes_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
        INSERT INTO logs (
            user_id, action, description
        )
        VALUES (
            NEW.user_id, 
            'BALANCE_UPDATED', 
            'Account balance changed from ' || OLD.balance || ' to ' || NEW.balance
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_balance_changes
AFTER UPDATE OF balance ON account
FOR EACH ROW
EXECUTE FUNCTION log_balance_changes_trigger();

-- Trigger to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_changes_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO logs (
            user_id, action, description
        )
        VALUES (
            NEW.user_id, 
            'ORDER_STATUS_UPDATED', 
            'Order #' || NEW.order_id || ' status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    
    -- Update timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_order_status_changes
BEFORE UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_status_changes_trigger();

-- Trigger to create a cart for a new user
CREATE OR REPLACE FUNCTION create_user_cart_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a new cart for the user
    INSERT INTO cart (user_id, created_at, updated_at)
    VALUES (NEW.user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_cart
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_cart_trigger();

-- Trigger to check and enforce stock levels when adding to cart
CREATE OR REPLACE FUNCTION check_stock_levels_trigger()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    -- Get current stock level
    SELECT stock INTO available_stock
    FROM products
    WHERE product_id = NEW.product_id;
    
    -- Check if enough stock is available
    IF available_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Not enough stock available for product ID %. Available: %, Requested: %', 
                        NEW.product_id, available_stock, NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stock_levels
BEFORE INSERT OR UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION check_stock_levels_trigger();

-- Trigger to create default account for new users
CREATE OR REPLACE FUNCTION create_default_account_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default account for user
    INSERT INTO account (user_id, account_type, balance, created_at)
    VALUES (
        NEW.user_id, 
        CASE 
            WHEN NEW.role = 'merchant' THEN 'merchant'::account_type
            ELSE 'user'::account_type
        END,
        0.00, 
        CURRENT_TIMESTAMP
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_account
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_account_trigger();

-- Trigger to record transaction history for refunds
CREATE OR REPLACE FUNCTION record_refund_transaction_trigger()
RETURNS TRIGGER AS $$
DECLARE
    account_id_var INTEGER;
    original_transaction_id INTEGER;
BEGIN
    -- Find the original transaction and account_id
    SELECT t.transaction_id, t.account_id 
    INTO original_transaction_id, account_id_var
    FROM transactions t
    JOIN orders o ON t.account_id = o.account_id
    WHERE o.user_id = NEW.user_id
    AND t.transaction_type = 'purchase'
    ORDER BY t.created_at DESC
    LIMIT 1;
    
    -- Create a refund transaction
    INSERT INTO transactions (
        account_id, amount, transaction_type, status, created_at
    )
    VALUES (
        account_id_var, NEW.amount, 'refund', 
        CASE 
            WHEN NEW.status = 'completed' THEN 'completed'::transaction_status
            ELSE 'pending'::transaction_status
        END,
        CURRENT_TIMESTAMP
    );
    
    -- If refund is completed, update account balance
    IF NEW.status = 'completed' THEN
        UPDATE account
        SET balance = balance + NEW.amount
        WHERE account_id = account_id_var;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_refund_transaction
AFTER INSERT OR UPDATE ON refunds
FOR EACH ROW
EXECUTE FUNCTION record_refund_transaction_trigger();

-- Trigger to log transaction status changes
CREATE OR REPLACE FUNCTION log_transaction_status_changes_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id_var INTEGER;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get user_id from the account
        SELECT user_id INTO user_id_var
        FROM account
        WHERE account_id = NEW.account_id;
        
        INSERT INTO logs (
            user_id, action, description
        )
        VALUES (
            user_id_var, 
            'TRANSACTION_STATUS_UPDATED', 
            'Transaction #' || NEW.transaction_id || ' status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_transaction_status_changes
AFTER UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_status_changes_trigger();

-- Trigger to reduce stock after ordering a product
CREATE OR REPLACE FUNCTION reduce_stock_after_order_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Reduce stock for the ordered product
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE product_id = NEW.product_id;

    -- Ensure stock does not go negative
    IF (SELECT stock FROM products WHERE product_id = NEW.product_id) < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for product ID %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reduce_stock_after_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION reduce_stock_after_order_trigger();

-- 
-- Trigger to increase reward points after a transaction
CREATE OR REPLACE FUNCTION increase_reward_points_trigger()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    -- Only award points for completed purchase transactions
    IF NEW.transaction_type = 'purchase' AND NEW.status = 'completed' THEN
        -- Calculate points (1 point per 10 currency units spent)
        points_to_award := FLOOR(NEW.amount / 10);

        -- Award points if above zero
        IF points_to_award > 0 THEN
            INSERT INTO reward_points (
                transaction_id, user_id, points, status, created_at
            )
            VALUES (
                NEW.transaction_id, NEW.user_id, points_to_award, 'earned', CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increase_reward_points
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION increase_reward_points_trigger();

-- Trigger to log checkout events
CREATE OR REPLACE FUNCTION log_checkout_event_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs (
        user_id, action, description, created_at
    )
    VALUES (
        NEW.user_id,
        'checkout',
        CONCAT('Checkout completed. Total: ₹', NEW.total_amount, ', Wallet: ₹', NEW.wallet_amount, ', Rewards: ₹', NEW.reward_discount, ', Payment Method: ', NEW.payment_method),
        CURRENT_TIMESTAMP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_checkout_event
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION log_checkout_event_trigger();

-- Trigger to update stock levels after checkout
CREATE OR REPLACE FUNCTION update_stock_after_checkout_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE product_id = NEW.product_id;

    -- Ensure stock does not go negative
    IF (SELECT stock FROM products WHERE product_id = NEW.product_id) < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for product ID %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_after_checkout
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_checkout_trigger();

-- Trigger to award reward points after checkout
CREATE OR REPLACE FUNCTION award_reward_points_after_checkout_trigger()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    -- Calculate points (5% of total amount before discounts)
    points_to_award := FLOOR(NEW.total_amount * 0.05);

    -- Award points if above zero
    IF points_to_award > 0 THEN
        INSERT INTO reward_points (
            transaction_id, user_id, points, status, created_at
        )
        VALUES (
            NEW.order_id, NEW.user_id, points_to_award, 'earned', CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_reward_points_after_checkout
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION award_reward_points_after_checkout_trigger();

-- Trigger to enforce stock levels during checkout
CREATE OR REPLACE FUNCTION enforce_stock_levels_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if enough stock is available
    IF (SELECT stock FROM products WHERE product_id = NEW.product_id) < NEW.quantity THEN
        RAISE EXCEPTION 'Not enough stock available for product ID %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_stock_levels
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION enforce_stock_levels_trigger();

-- Trigger to calculate reward points after checkout
CREATE OR REPLACE FUNCTION calculate_reward_points_trigger()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    -- Calculate points (5% of total amount before discounts)
    points_to_award := FLOOR(NEW.total_amount * 0.05);

    -- Award points if above zero
    IF points_to_award > 0 THEN
        INSERT INTO reward_points (
            transaction_id, user_id, points, status, created_at
        )
        VALUES (
            NEW.order_id, NEW.user_id, points_to_award, 'earned', CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_reward_points
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_reward_points_trigger();

-- Trigger to update product stock after an order
CREATE OR REPLACE FUNCTION update_product_stock_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Reduce stock for the ordered product
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_trigger();