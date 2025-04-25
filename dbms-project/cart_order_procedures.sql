-- cart_order_procedures.sql - SQL procedures for cart and order operations

-- Function to get or create user cart
CREATE OR REPLACE FUNCTION get_or_create_user_cart(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_cart_id INTEGER;
BEGIN
    -- Try to get existing cart
    SELECT cart_id INTO v_cart_id
    FROM cart
    WHERE user_id = p_user_id;
    
    -- If no cart exists, create one
    IF v_cart_id IS NULL THEN
        INSERT INTO cart (user_id, created_at, updated_at)
        VALUES (p_user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING cart_id INTO v_cart_id;
    END IF;
    
    RETURN v_cart_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to add item to cart
CREATE OR REPLACE PROCEDURE add_to_cart(
    p_user_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id INTEGER;
    v_existing_item_id INTEGER;
    v_existing_quantity INTEGER;
    v_product_stock INTEGER;
BEGIN
    -- Check if product exists and has sufficient stock
    SELECT stock INTO v_product_stock
    FROM products
    WHERE product_id = p_product_id AND status = 'active';
    
    IF v_product_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    IF v_product_stock < p_quantity THEN
        RAISE EXCEPTION 'Not enough stock available';
    END IF;
    
    -- Get or create cart
    v_cart_id := get_or_create_user_cart(p_user_id);
    
    -- Check if item already exists in cart
    SELECT cart_item_id, quantity 
    INTO v_existing_item_id, v_existing_quantity
    FROM cart_items
    WHERE cart_id = v_cart_id AND product_id = p_product_id;
    
    -- If item exists, update quantity
    IF v_existing_item_id IS NOT NULL THEN
        -- Check if new total quantity exceeds stock
        IF (v_existing_quantity + p_quantity) > v_product_stock THEN
            RAISE EXCEPTION 'Adding this quantity would exceed available stock';
        END IF;
        
        UPDATE cart_items
        SET 
            quantity = quantity + p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE cart_item_id = v_existing_item_id;
    -- Otherwise, add new item
    ELSE
        INSERT INTO cart_items (
            cart_id,
            product_id,
            quantity,
            created_at,
            updated_at
        ) VALUES (
            v_cart_id,
            p_product_id,
            p_quantity,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Update cart updated_at timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = v_cart_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'ADD_TO_CART', 'Added product to cart', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to update cart item quantity
CREATE OR REPLACE PROCEDURE update_cart_item(
    p_user_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id INTEGER;
    v_cart_item_id INTEGER;
    v_product_stock INTEGER;
BEGIN
    -- Get user's cart ID
    SELECT cart_id INTO v_cart_id
    FROM cart
    WHERE user_id = p_user_id;
    
    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'Cart not found';
    END IF;
    
    -- Check if cart item exists
    SELECT cart_item_id INTO v_cart_item_id
    FROM cart_items
    WHERE cart_id = v_cart_id AND product_id = p_product_id;
    
    IF v_cart_item_id IS NULL THEN
        RAISE EXCEPTION 'Item not in cart';
    END IF;
    
    -- Check product stock
    SELECT stock INTO v_product_stock
    FROM products
    WHERE product_id = p_product_id AND status = 'active';
    
    IF v_product_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    IF v_product_stock < p_quantity THEN
        RAISE EXCEPTION 'Not enough stock available';
    END IF;
    
    -- If quantity is 0, remove item from cart
    IF p_quantity = 0 THEN
        DELETE FROM cart_items
        WHERE cart_item_id = v_cart_item_id;
    ELSE
        -- Update item quantity
        UPDATE cart_items
        SET 
            quantity = p_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE cart_item_id = v_cart_item_id;
    END IF;
    
    -- Update cart updated_at timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = v_cart_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'UPDATE_CART', 'Updated cart item quantity', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure to remove item from cart
CREATE OR REPLACE PROCEDURE remove_from_cart(
    p_user_id INTEGER,
    p_product_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id INTEGER;
BEGIN
    -- Get user's cart ID
    SELECT cart_id INTO v_cart_id
    FROM cart
    WHERE user_id = p_user_id;
    
    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'Cart not found';
    END IF;
    
    -- Remove item from cart
    DELETE FROM cart_items
    WHERE cart_id = v_cart_id AND product_id = p_product_id;
    
    -- Update cart updated_at timestamp
    UPDATE cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = v_cart_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'REMOVE_FROM_CART', 'Removed product from cart', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get user cart with items
CREATE OR REPLACE FUNCTION get_user_cart(p_user_id INTEGER)
RETURNS TABLE (
    cart_id INTEGER,
    user_id INTEGER,
    items JSON,
    total_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_cart_id INTEGER;
    v_total DECIMAL(10,2) := 0;
    v_items JSON;
BEGIN
    -- Get user's cart ID
    SELECT cart_id INTO v_cart_id
    FROM cart
    WHERE user_id = p_user_id;
    
    IF v_cart_id IS NULL THEN
        -- Create a new cart if not exists
        v_cart_id := get_or_create_user_cart(p_user_id);
        
        -- Return empty cart
        RETURN QUERY
        SELECT 
            v_cart_id,
            p_user_id,
            '[]'::JSON,
            0::DECIMAL(10,2);
        RETURN;
    END IF;
    
    -- Get cart items with product details
    SELECT 
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'cart_item_id', ci.cart_item_id,
                    'product_id', p.product_id,
                    'name', p.name,
                    'price', p.price,
                    'quantity', ci.quantity,
                    'image_url', p.image_url,
                    'subtotal', (p.price * ci.quantity)
                )
            ),
            '[]'::JSON
        ),
        COALESCE(SUM(p.price * ci.quantity), 0)
    INTO v_items, v_total
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.product_id
    WHERE ci.cart_id = v_cart_id;
    
    -- Return cart with items and total
    RETURN QUERY
    SELECT 
        v_cart_id,
        p_user_id,
        v_items,
        v_total;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create order from cart
CREATE OR REPLACE PROCEDURE create_order(
    p_user_id INTEGER,
    p_account_id INTEGER,
    p_payment_method TEXT,
    p_use_wallet BOOLEAN DEFAULT FALSE,
    p_use_rewards BOOLEAN DEFAULT FALSE,
    p_reward_points INTEGER DEFAULT 0,
    INOUT p_order_id INTEGER DEFAULT NULL,
    INOUT p_total_amount DECIMAL(10,2) DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id INTEGER;
    v_cart_total DECIMAL(10,2);
    v_wallet_balance DECIMAL(10,2);
    v_wallet_amount DECIMAL(10,2) := 0;
    v_reward_discount DECIMAL(10,2) := 0;
    v_available_reward_points INTEGER;
    v_reward_value DECIMAL(10,2) := 0;
    v_cart_items RECORD;
    v_transaction_id INTEGER;
    v_points_earned INTEGER;
BEGIN
    -- Get user's cart and total
    SELECT c.cart_id, ct.total_amount
    INTO v_cart_id, v_cart_total
    FROM cart c,
         LATERAL (SELECT * FROM get_user_cart(p_user_id)) ct
    WHERE c.user_id = p_user_id;
    
    IF v_cart_id IS NULL OR v_cart_total = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;
    
    -- Calculate total amount
    p_total_amount := v_cart_total;
    
    -- Apply reward points if requested
    IF p_use_rewards AND p_reward_points > 0 THEN
        -- Get available reward points
        v_available_reward_points := get_user_reward_points(p_user_id);
        
        IF v_available_reward_points < p_reward_points THEN
            RAISE EXCEPTION 'Not enough reward points available';
        END IF;
        
        -- Calculate reward discount (1 point = 0.1 currency units)
        v_reward_value := p_reward_points * 0.1;
        v_reward_discount := LEAST(v_reward_value, p_total_amount * 0.3); -- Max 30% discount
        p_total_amount := p_total_amount - v_reward_discount;
    END IF;
    
    -- Use wallet balance if requested
    IF p_use_wallet THEN
        -- Get wallet balance
        SELECT balance INTO v_wallet_balance
        FROM account
        WHERE account_id = p_account_id;
        
        IF v_wallet_balance > 0 THEN
            v_wallet_amount := LEAST(v_wallet_balance, p_total_amount);
            p_total_amount := p_total_amount - v_wallet_amount;
        END IF;
    END IF;
    
    -- Create order
    INSERT INTO orders (
        user_id,
        account_id,
        total_amount,
        status,
        payment_method,
        wallet_amount,
        reward_discount,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_account_id,
        v_cart_total, -- Store original total before discounts
        'pending',
        p_payment_method,
        v_wallet_amount,
        v_reward_discount,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING order_id INTO p_order_id;
    
    -- Copy items from cart to order
    FOR v_cart_items IN 
        SELECT ci.product_id, ci.quantity, p.price, p.merchant_id, p.stock
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        -- Add item to order
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price_at_time,
            created_at
        ) VALUES (
            p_order_id,
            v_cart_items.product_id,
            v_cart_items.quantity,
            v_cart_items.price,
            CURRENT_TIMESTAMP
        );
        
        -- Update product stock
        UPDATE products
        SET 
            stock = stock - v_cart_items.quantity,
            status = CASE 
                        WHEN (stock - v_cart_items.quantity) <= 0 THEN 'out_of_stock'::product_status
                        ELSE status
                     END,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = v_cart_items.product_id;
    END LOOP;
    
    -- Process payment from wallet if needed
    IF v_wallet_amount > 0 THEN
        -- Deduct from wallet
        UPDATE account
        SET balance = balance - v_wallet_amount
        WHERE account_id = p_account_id;
        
        -- Create wallet transaction
        INSERT INTO transactions (
            account_id,
            amount,
            transaction_type,
            status,
            created_at
        ) VALUES (
            p_account_id,
            v_wallet_amount,
            'purchase',
            'completed',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Process reward point redemption if needed
    IF v_reward_discount > 0 THEN
        -- Record reward point usage
        INSERT INTO reward_points (
            user_id,
            points,
            status,
            created_at
        ) VALUES (
            p_user_id,
            p_reward_points,
            'redeemed',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Process remaining payment if any
    IF p_total_amount > 0 THEN
        -- For credit/debit card, online payment, etc.
        -- In a real system, this would interface with payment gateway
        -- Here we just record the transaction
        INSERT INTO transactions (
            account_id,
            amount,
            transaction_type,
            status,
            created_at
        ) VALUES (
            p_account_id,
            p_total_amount,
            'purchase',
            'completed',
            CURRENT_TIMESTAMP
        ) RETURNING transaction_id INTO v_transaction_id;
    END IF;
    
    -- Award reward points for purchase (1 point per 10 currency units)
    v_points_earned := FLOOR(v_cart_total / 10);
    
    IF v_points_earned > 0 THEN
        INSERT INTO reward_points (
            transaction_id,
            user_id,
            points,
            status,
            created_at
        ) VALUES (
            v_transaction_id,
            p_user_id,
            v_points_earned,
            'earned',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Update order status to completed
    UPDATE orders
    SET 
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id;
    
    -- Clear the cart
    DELETE FROM cart_items
    WHERE cart_id = v_cart_id;
    
    -- Create log entry
    INSERT INTO logs (user_id, action, description, created_at)
    VALUES (p_user_id, 'ORDER_CREATED', 'Created order from cart', CURRENT_TIMESTAMP);
END;
$$;

-- Function to get order details with items
CREATE OR REPLACE FUNCTION get_order_details(p_order_id INTEGER)
RETURNS TABLE (
    order_id INTEGER,
    user_id INTEGER,
    account_id INTEGER,
    wallet_amount DECIMAL(10,2),
    reward_discount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status order_status,
    items JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    payment_method TEXT,
    reward_points_earned INTEGER
) AS $$
DECLARE
    v_items JSON;
    v_reward_points INTEGER;
BEGIN
    -- Get reward points earned for this order
    SELECT COALESCE(SUM(points), 0) INTO v_reward_points
    FROM reward_points rp
    JOIN transactions t ON rp.transaction_id = t.transaction_id
    JOIN orders o ON t.account_id = o.account_id AND DATE_TRUNC('minute', t.created_at) = DATE_TRUNC('minute', o.created_at)
    WHERE o.order_id = p_order_id AND rp.status = 'earned';
    
    -- Get order items with product details
    SELECT 
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'order_item_id', oi.order_item_id,
                    'product_id', p.product_id,
                    'name', p.name,
                    'price', oi.price_at_time,
                    'quantity', oi.quantity,
                    'image_url', p.image_url,
                    'subtotal', (oi.price_at_time * oi.quantity)
                )
            ),
            '[]'::JSON
        )
    INTO v_items
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    WHERE oi.order_id = p_order_id;
    
    -- Return order with items
    RETURN QUERY
    SELECT 
        o.order_id,
        o.user_id,
        o.account_id,
        o.wallet_amount,
        o.reward_discount,
        o.total_amount,
        o.status,
        v_items,
        o.created_at,
        o.updated_at,
        o.payment_method,
        v_reward_points
    FROM orders o
    WHERE o.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user orders
CREATE OR REPLACE FUNCTION get_user_orders(p_user_id INTEGER)
RETURNS TABLE (
    order_id INTEGER,
    user_id INTEGER,
    account_id INTEGER,
    wallet_amount DECIMAL(10,2),
    reward_discount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status order_status,
    items JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    payment_method TEXT,
    reward_points_earned INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT order_id FROM orders 
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
    ) o
    CROSS JOIN LATERAL get_order_details(o.order_id);
END;
$$ LANGUAGE plpgsql; 