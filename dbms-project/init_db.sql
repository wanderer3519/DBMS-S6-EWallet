-- Trigger to log changes in account balances
CREATE OR REPLACE FUNCTION log_balance_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Logs(user_id, action, description, created_at)
    VALUES (
        NEW.user_id,
        'balance_update',
        CONCAT('Balance updated to ', NEW.balance),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER balance_changes_trigger
AFTER UPDATE OF balance ON Account
FOR EACH ROW
EXECUTE FUNCTION log_balance_changes();

-- Trigger to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Logs(user_id, action, description, created_at)
    VALUES (
        OLD.user_id,
        'order_status_update',
        CONCAT('Order status changed to ', NEW.status),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_changes_trigger
AFTER UPDATE OF status ON Orders
FOR EACH ROW
EXECUTE FUNCTION log_order_status_changes();

-- Trigger to log product updates
CREATE OR REPLACE FUNCTION log_product_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Logs(user_id, action, description, created_at)
    VALUES (
        NEW.merchant_id,
        'product_update',
        CONCAT('Product ', NEW.name, ' updated'),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_updates_trigger
AFTER UPDATE ON Products
FOR EACH ROW
EXECUTE FUNCTION log_product_updates();

-- Trigger to log reward redemptions
CREATE OR REPLACE FUNCTION log_reward_redemptions()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Logs(user_id, action, description, created_at)
    VALUES (
        NEW.user_id,
        'reward_redemption',
        CONCAT('Redeemed ', NEW.points, ' points'),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reward_redemptions_trigger
AFTER UPDATE OF status ON RewardPoints
FOR EACH ROW
WHEN (NEW.status = 'redeemed')
EXECUTE FUNCTION log_reward_redemptions();

-- Trigger to log profile updates
CREATE OR REPLACE FUNCTION log_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Logs(user_id, action, description, created_at)
    VALUES (
        NEW.user_id,
        'profile_update',
        'User profile updated',
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_updates_trigger
AFTER UPDATE ON Users
FOR EACH ROW
EXECUTE FUNCTION log_profile_updates();

-- Role for admin
CREATE ROLE admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;

-- Role for merchant
CREATE ROLE merchant;
GRANT SELECT, INSERT, UPDATE ON Products TO merchant;
GRANT SELECT, INSERT, UPDATE ON Orders TO merchant;
GRANT SELECT ON Logs TO merchant;

-- Role for user
CREATE ROLE user;
GRANT SELECT ON Products TO user;
GRANT SELECT, INSERT, UPDATE ON Cart TO user;
GRANT SELECT, INSERT, UPDATE ON Orders TO user;
GRANT SELECT ON RewardPoints TO user;

-- View for user profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    u.status,
    u.created_at,
    a.account_id,
    a.balance
FROM Users u
LEFT JOIN Account a ON u.user_id = a.user_id;

-- View for merchant stats
CREATE OR REPLACE VIEW merchant_stats AS
SELECT 
    m.merchant_id,
    m.business_name,
    m.business_category,
    COUNT(p.product_id) AS total_products,
    SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS active_products
FROM Merchants m
LEFT JOIN Products p ON m.merchant_id = p.merchant_id
GROUP BY m.merchant_id;

-- View for order summaries
CREATE OR REPLACE VIEW order_summaries AS
SELECT 
    o.order_id,
    o.user_id,
    o.total_amount,
    o.status,
    o.created_at,
    COUNT(oi.order_item_id) AS total_items
FROM Orders o
LEFT JOIN OrderItems oi ON o.order_id = oi.order_id
GROUP BY o.order_id;

-- View for product details
CREATE OR REPLACE VIEW product_details AS
SELECT 
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.business_category,
    p.status,
    p.created_at,
    m.business_name AS merchant_name
FROM Products p
LEFT JOIN Merchants m ON p.merchant_id = m.merchant_id;



-- ******************************************************************************************

CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    u.status,
    u.created_at,
    a.account_id,
    a.balance
FROM Users u
LEFT JOIN Account a ON u.user_id = a.user_id;

CREATE OR REPLACE VIEW product_search_view AS
SELECT 
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.business_category,
    p.status,
    p.created_at,
    p.updated_at,
    m.merchant_id,
    m.business_name,
    u.user_id
FROM Products p
LEFT JOIN Merchants m ON p.merchant_id = m.merchant_id
LEFT JOIN Users u ON m.user_id = u.user_id;

CREATE OR REPLACE VIEW category_view AS
SELECT 
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.business_category,
    p.status,
    p.created_at,
    p.updated_at,
    m.merchant_id,
    m.business_name
FROM Products p
LEFT JOIN Merchants m ON p.merchant_id = m.merchant_id
WHERE p.business_category IS NOT NULL;


CREATE OR REPLACE VIEW order_summaries AS
SELECT 
    o.order_id,
    o.user_id,
    o.total_amount,
    o.status,
    o.created_at,
    COUNT(oi.order_item_id) AS total_items
FROM Orders o
LEFT JOIN Order_Items oi ON o.order_id = oi.order_id
GROUP BY o.order_id;

CREATE OR REPLACE VIEW product_details AS
SELECT 
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.business_category,
    p.status,
    p.created_at,
    m.business_name AS merchant_name
FROM Products p
LEFT JOIN Merchants m ON p.merchant_id = m.merchant_id;

-- Trigger
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

-- Trigger
CREATE OR REPLACE FUNCTION update_product_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on stock level
    IF NEW.stock <= 0 THEN
        NEW.status := 'out_of_stock';
    ELSIF NEW.status = 'out_of_stock' AND NEW.stock > 0 THEN
        NEW.status := 'active';
    END IF;
    
    -- Update the timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER product_stock_update
BEFORE UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_status_trigger();