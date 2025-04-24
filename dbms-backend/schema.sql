-- schema.sql - SQL schema definitions converted from models.py

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'merchant', 'support');
CREATE TYPE user_status AS ENUM ('active', 'blocked');
CREATE TYPE account_type AS ENUM ('user', 'merchant');
CREATE TYPE transaction_type AS ENUM ('top-up', 'purchase', 'withdrawal', 'refund', 'reward_redemption');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE refund_status AS ENUM ('pending', 'completed', 'rejected');
CREATE TYPE reward_status AS ENUM ('earned', 'redeemed', 'expired');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'out_of_stock');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    phone VARCHAR(12),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255)
);

-- Create Account table
CREATE TABLE IF NOT EXISTS account (
    account_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    account_type account_type NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES account(account_id),
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    refund_id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(transaction_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL,
    status refund_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Logs table
CREATE TABLE IF NOT EXISTS logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    action VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create RewardPoints table
CREATE TABLE IF NOT EXISTS reward_points (
    reward_id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    points INTEGER NOT NULL,
    status reward_status NOT NULL DEFAULT 'earned',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Merchants table
CREATE TABLE IF NOT EXISTS merchants (
    merchant_id SERIAL,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    business_name VARCHAR(255) NOT NULL,
    business_category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact VARCHAR(12),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (merchant_id, business_category)
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    business_category VARCHAR(50) NOT NULL,
    image_url VARCHAR(255),
    status product_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id, business_category) REFERENCES merchants(merchant_id, business_category)
);

-- Create Cart table
CREATE TABLE IF NOT EXISTS cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create CartItems table
CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES cart(cart_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    account_id INTEGER NOT NULL REFERENCES account(account_id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    wallet_amount DECIMAL(10, 2) DEFAULT 0,
    reward_discount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create OrderItems table
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id); 