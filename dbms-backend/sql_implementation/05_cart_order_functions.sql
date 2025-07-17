-- ======================================================================
-- Cart and Order Management Functions
-- ======================================================================

-- Function to get or create user cart
CREATE OR REPLACE FUNCTION get_or_create_user_cart(
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    cart_id_var INTEGER;
BEGIN
    -- Check if user already has a cart
    SELECT cart_id INTO cart_id_var
    FROM cart
    WHERE user_id = p_user_id;
    
    -- If not, create a new cart
    IF NOT FOUND THEN
        INSERT INTO cart (user_id, created_at, updated_at)
        VALUES (p_user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING cart_id INTO cart_id_var;
    END IF;
    
    RETURN cart_id_var;
END;
$$ LANGUAGE plpgsql;

-- Function to add item to cart
CREATE OR REPLACE FUNCTION add_to_cart(
    p_user_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    cart_id_var INTEGER;
    existing_item_id INTEGER;
    current_quantity INTEGER;
    product_stock INTEGER;
BEGIN
    -- Validate quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;
    
    -- Check if product exists and has enough stock
    SELECT stock INTO product_stock
    FROM products
    WHERE product_id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist', p_product_id;
    END IF;
    
    IF product_stock < p_quantity THEN
        RAISE EXCEPTION 'Not enough stock available. Available: %, Requested: %', 
                         product_stock, p_quantity;
    END IF;
    
    -- Get or create cart
    cart_id_var := get_or_create_user_cart(p_user_id);
    
    -- Check if item already exists in cart
    SELECT cart_item_id, quantity INTO existing_item_id, current_quantity
    FROM cart_items
    WHERE cart_id = cart_id_var AND product_id = p_product_id;
    
    IF FOUND THEN
        -- Update existing item quantity
        UPDATE cart_items
        SET quantity = current_quantity + p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE cart_item_id = existing_item_id;
    ELSE
        -- Add new item to cart
        INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
        VALUES (cart_id_var, p_product_id, p_quantity, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
    
    -- Update cart timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = cart_id_var;
    
    -- Log cart update
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'CART_UPDATED', 'Added product ' || p_product_id || ' to cart');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update cart item quantity
CREATE OR REPLACE FUNCTION update_cart_item(
    p_user_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    cart_id_var INTEGER;
    cart_item_id_var INTEGER;
    product_stock INTEGER;
BEGIN
    -- Validate quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;
    
    -- Get user's cart
    SELECT cart_id INTO cart_id_var
    FROM cart
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found for user %', p_user_id;
    END IF;
    
    -- Check if cart item exists
    SELECT cart_item_id INTO cart_item_id_var
    FROM cart_items
    WHERE cart_id = cart_id_var AND product_id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found in cart', p_product_id;
    END IF;
    
    -- Check if product has enough stock
    SELECT stock INTO product_stock
    FROM products
    WHERE product_id = p_product_id;
    
    IF product_stock < p_quantity THEN
        RAISE EXCEPTION 'Not enough stock available. Available: %, Requested: %', 
                         product_stock, p_quantity;
    END IF;
    
    -- Update cart item
    UPDATE cart_items
    SET quantity = p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE cart_item_id = cart_item_id_var;
    
    -- Update cart timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = cart_id_var;
    
    -- Log cart update
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'CART_UPDATED', 'Updated quantity for product ' || p_product_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove item from cart
CREATE OR REPLACE FUNCTION remove_from_cart(
    p_user_id INTEGER,
    p_product_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    cart_id_var INTEGER;
BEGIN
    -- Get user's cart
    SELECT cart_id INTO cart_id_var
    FROM cart
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found for user %', p_user_id;
    END IF;
    
    -- Remove item from cart
    DELETE FROM cart_items
    WHERE cart_id = cart_id_var AND product_id = p_product_id;
    
    -- Update cart timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = cart_id_var;
    
    -- Log cart update
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'CART_UPDATED', 'Removed product ' || p_product_id || ' from cart');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get cart contents with total
CREATE OR REPLACE FUNCTION get_cart_contents(
    p_user_id INTEGER
) RETURNS TABLE (
    cart_id INTEGER,
    items JSON,
    total_amount DECIMAL(10,2)
) AS $$
DECLARE
    cart_id_var INTEGER;
    items_json JSON;
    total DECIMAL(10,2);
BEGIN
    -- Get user's cart
    SELECT cart_id INTO cart_id_var
    FROM cart
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create a new cart if it doesn't exist
        cart_id_var := get_or_create_user_cart(p_user_id);
        
        -- Return empty cart
        RETURN QUERY
        SELECT 
            cart_id_var,
            '[]'::JSON,
            0::DECIMAL(10,2);
            
        RETURN;
    END IF;
    
    -- Get cart items as JSON
    SELECT 
        json_agg(
            json_build_object(
                'cart_item_id', ci.cart_item_id,
                'product_id', p.product_id,
                'name', p.name,
                'price', p.price,
                'mrp', p.mrp,
                'quantity', ci.quantity,
                'image_url', p.image_url,
                'subtotal', p.price * ci.quantity
            )
        ) INTO items_json
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.product_id
    WHERE ci.cart_id = cart_id_var;
    
    -- Calculate total amount
    SELECT COALESCE(SUM(p.price * ci.quantity), 0) INTO total
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.product_id
    WHERE ci.cart_id = cart_id_var;
    
    -- If no items, set items_json to empty array
    IF items_json IS NULL THEN
        items_json := '[]'::JSON;
    END IF;
    
    -- Return cart data
    RETURN QUERY
    SELECT 
        cart_id_var,
        items_json,
        total;
END;
$$ LANGUAGE plpgsql;

-- Function to create an order from cart
CREATE OR REPLACE FUNCTION create_order(
    p_user_id INTEGER,
    p_account_id INTEGER,
    p_payment_method VARCHAR(50),
    p_use_wallet BOOLEAN DEFAULT FALSE,
    p_use_rewards BOOLEAN DEFAULT FALSE,
    p_reward_points INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    cart_id_var INTEGER;
    new_order_id INTEGER;
    total_amount DECIMAL(10,2);
    wallet_amount DECIMAL(10,2) := 0;
    reward_discount DECIMAL(10,2) := 0;
    remaining_amount DECIMAL(10,2);
    current_balance DECIMAL(10,2);
    reward_points_available INTEGER;
    reward_points_value DECIMAL(10,2);
    new_transaction_id INTEGER;
BEGIN
    -- Get user's cart
    SELECT cart_id INTO cart_id_var
    FROM cart
    WHERE user_id = p_user_id;
    
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = cart_id_var) THEN
        RAISE EXCEPTION 'Cart is empty or does not exist';
    END IF;
    
    -- Calculate total amount
    SELECT SUM(p.price * ci.quantity) INTO total_amount
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.product_id
    WHERE ci.cart_id = cart_id_var;
    
    -- Process reward points if used
    IF p_use_rewards AND p_reward_points > 0 THEN
        -- Get available reward points
        SELECT available_points INTO reward_points_available
        FROM get_user_reward_points(p_user_id);
        
        IF reward_points_available < p_reward_points THEN
            RAISE EXCEPTION 'Insufficient reward points. Available: %, Requested: %',
                          reward_points_available, p_reward_points;
        END IF;
        
        -- Calculate reward discount (1 point = 0.1 currency units)
        reward_discount := p_reward_points * 0.1;
        
        -- Limit reward discount to no more than 20% of total
        IF reward_discount > (total_amount * 0.2) THEN
            reward_discount := total_amount * 0.2;
            -- Recalculate points used based on capped discount
            p_reward_points := FLOOR(reward_discount / 0.1);
        END IF;
    END IF;
    
    -- Process wallet payment if used
    IF p_use_wallet THEN
        -- Get current wallet balance
        SELECT balance INTO current_balance
        FROM account
        WHERE account_id = p_account_id;
        
        -- Determine how much to take from wallet
        wallet_amount := LEAST(current_balance, total_amount - reward_discount);
    END IF;
    
    -- Calculate remaining amount to be paid
    remaining_amount := total_amount - reward_discount - wallet_amount;
    
    -- Create order record
    INSERT INTO orders (
        user_id, account_id, total_amount, status, payment_method,
        wallet_amount, reward_discount, created_at, updated_at
    )
    VALUES (
        p_user_id, p_account_id, total_amount, 
        CASE WHEN remaining_amount <= 0 THEN 'processing' ELSE 'pending' END,
        p_payment_method, wallet_amount, reward_discount,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING order_id INTO new_order_id;
    
    -- Add items to order
    INSERT INTO order_items (order_id, product_id, quantity, price_at_time, created_at)
    SELECT 
        new_order_id, ci.product_id, ci.quantity, p.price, CURRENT_TIMESTAMP
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.product_id
    WHERE ci.cart_id = cart_id_var;
    
    -- Process wallet payment if used
    IF p_use_wallet AND wallet_amount > 0 THEN
        -- Update account balance
        UPDATE account
        SET balance = balance - wallet_amount
        WHERE account_id = p_account_id;
        
        -- Record transaction
        INSERT INTO transactions (
            account_id, amount, transaction_type, status, created_at
        )
        VALUES (
            p_account_id, wallet_amount, 'purchase', 'completed', CURRENT_TIMESTAMP
        )
        RETURNING transaction_id INTO new_transaction_id;
    END IF;
    
    -- Process reward points if used
    IF p_use_rewards AND p_reward_points > 0 THEN
        -- Record redemption in reward points
        INSERT INTO reward_points (
            user_id, points, status, created_at
        )
        VALUES (
            p_user_id, p_reward_points, 'redeemed', CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Update product stock
    UPDATE products p
    SET stock = p.stock - ci.quantity,
        status = CASE WHEN p.stock - ci.quantity <= 0 THEN 'out_of_stock'::product_status
                     ELSE p.status END
    FROM cart_items ci
    WHERE ci.cart_id = cart_id_var
    AND p.product_id = ci.product_id;
    
    -- Clear cart after successful order
    DELETE FROM cart_items WHERE cart_id = cart_id_var;
    
    -- Log order creation
    INSERT INTO logs (user_id, action, description)
    VALUES (p_user_id, 'ORDER_CREATED', 'New order created with ID: ' || new_order_id);
    
    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get order details
CREATE OR REPLACE FUNCTION get_order_details(
    p_order_id INTEGER
) RETURNS TABLE (
    order_id INTEGER,
    user_id INTEGER,
    account_id INTEGER,
    total_amount DECIMAL(10,2),
    status order_status,
    payment_method VARCHAR(50),
    wallet_amount DECIMAL(10,2),
    reward_discount DECIMAL(10,2),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    items JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id, o.user_id, o.account_id, o.total_amount, o.status,
        o.payment_method, o.wallet_amount, o.reward_discount,
        o.created_at, o.updated_at,
        (
            SELECT json_agg(
                json_build_object(
                    'order_item_id', oi.order_item_id,
                    'product_id', p.product_id,
                    'product_name', p.name,
                    'price_at_time', oi.price_at_time,
                    'quantity', oi.quantity,
                    'subtotal', oi.price_at_time * oi.quantity,
                    'image_url', p.image_url
                )
            )
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = o.order_id
        ) AS items
    FROM orders o
    WHERE o.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user orders
CREATE OR REPLACE FUNCTION get_user_orders(
    p_user_id INTEGER
) RETURNS TABLE (
    order_id INTEGER,
    total_amount DECIMAL(10,2),
    status order_status,
    payment_method VARCHAR(50),
    created_at TIMESTAMP,
    items JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id, o.total_amount, o.status, o.payment_method, o.created_at,
        (
            SELECT json_agg(
                json_build_object(
                    'order_item_id', oi.order_item_id,
                    'product_id', p.product_id,
                    'product_name', p.name,
                    'price_at_time', oi.price_at_time,
                    'quantity', oi.quantity,
                    'subtotal', oi.price_at_time * oi.quantity,
                    'image_url', p.image_url
                )
            )
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = o.order_id
        ) AS items
    FROM orders o
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql; 