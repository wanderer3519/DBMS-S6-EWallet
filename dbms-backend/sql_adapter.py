"""
SQL Adapter - Connects the backend with the SQL implementation.
This file serves as a bridge between the FastAPI endpoints and the SQL database.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor, DictCursor
from dotenv import load_dotenv
from datetime import datetime
import json
from typing import Dict, List, Optional, Any, Union
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection string
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Get a database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise Exception(f"Database connection failed: {e}")

def execute_query(query, params=None, fetch=True, fetch_one=False):
    """Execute a SQL query and return the results"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, params or ())
        
        if fetch:
            if fetch_one:
                result = cursor.fetchone()
            else:
                result = cursor.fetchall()
            conn.commit()
            return result
        else:
            conn.commit()
            return None
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Query execution error: {e}")
        raise Exception(f"Query execution failed: {e}")
    finally:
        if conn:
            conn.close()

def execute_procedure(procedure_name, params=None, fetch=True, fetch_one=False):
    """Execute a SQL stored procedure and return the results"""
    placeholders = ', '.join(['%s'] * len(params)) if params else ''
    query = f"CALL {procedure_name}({placeholders})"
    return execute_query(query, params, fetch, fetch_one)

def execute_function(function_name, params=None, fetch=True, fetch_one=False):
    """Execute a SQL function and return the results"""
    placeholders = ', '.join(['%s'] * len(params)) if params else ''
    query = f"SELECT * FROM {function_name}({placeholders})"
    return execute_query(query, params, fetch, fetch_one)

# User operations
def create_user(full_name, email, password, role='customer', phone=None):
    """Create a new user"""
    try:
        query = """
        DO $$
        DECLARE v_user_id INTEGER;
        BEGIN
            CALL create_user(%s, %s, %s, %s, %s, v_user_id);
            SELECT v_user_id;
        END
        $$;
        """
        user_id = execute_query("SELECT * FROM create_user(%s, %s, %s, %s, %s, NULL) AS user_id", 
                               (full_name, email, password, role, phone), True, True)
        return user_id
    except Exception as e:
        logger.error(f"User creation error: {e}")
        raise Exception(str(e))

def authenticate_user(email, password):
    """Authenticate a user"""
    try:
        user = execute_function("authenticate_user", (email, password), True, True)
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise Exception(str(e))

def get_user_profile(user_id):
    """Get user profile"""
    try:
        profile = execute_function("get_user_profile", (user_id,), True, True)
        
        # Get user accounts
        accounts = execute_function("get_user_accounts", (user_id,), True, False)
        
        # Combine profile and accounts
        if profile:
            profile['accounts'] = accounts or []
        
        return profile
    except Exception as e:
        logger.error(f"Get user profile error: {e}")
        raise Exception(str(e))

def update_user_profile(user_id, full_name=None, email=None):
    """Update user profile"""
    try:
        execute_procedure("update_user_profile", (user_id, full_name, email), False)
        return get_user_profile(user_id)
    except Exception as e:
        logger.error(f"Update user profile error: {e}")
        raise Exception(str(e))

def change_user_password(user_id, current_password, new_password):
    """Change user password"""
    try:
        execute_procedure("change_password", (user_id, current_password, new_password), False)
        return {"success": True, "message": "Password changed successfully"}
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise Exception(str(e))

# Account operations
def create_account(user_id, account_type='user'):
    """Create a new account"""
    try:
        account_id = execute_query("SELECT * FROM create_account(%s, %s, NULL) AS account_id", 
                                 (user_id, account_type), True, True)
        
        # Get the created account details
        account = execute_function("get_user_accounts", (user_id,), True, False)
        return account[-1] if account else None
    except Exception as e:
        logger.error(f"Account creation error: {e}")
        raise Exception(str(e))

def get_user_accounts(user_id):
    """Get all accounts for a user"""
    try:
        accounts = execute_function("get_user_accounts", (user_id,), True, False)
        return accounts
    except Exception as e:
        logger.error(f"Get user accounts error: {e}")
        raise Exception(str(e))

def top_up_account(account_id, amount, payment_method='online'):
    """Add funds to an account"""
    try:
        transaction_id = execute_query("SELECT * FROM top_up_account(%s, %s, %s, NULL) AS transaction_id", 
                                      (account_id, amount, payment_method), True, True)
        
        # Get the transaction details
        transaction = execute_function("get_account_transactions", (account_id,), True, False)
        return transaction[0] if transaction else None
    except Exception as e:
        logger.error(f"Top up account error: {e}")
        raise Exception(str(e))

def get_account_transactions(account_id):
    """Get all transactions for an account"""
    try:
        transactions = execute_function("get_account_transactions", (account_id,), True, False)
        return transactions
    except Exception as e:
        logger.error(f"Get account transactions error: {e}")
        raise Exception(str(e))

def get_user_reward_points(user_id):
    """Get total reward points for a user"""
    try:
        points = execute_function("get_user_reward_points", (user_id,), True, True)
        return points
    except Exception as e:
        logger.error(f"Get reward points error: {e}")
        raise Exception(str(e))

def redeem_reward_points(user_id, points):
    """Redeem reward points"""
    try:
        amount_credited = execute_query("SELECT * FROM redeem_reward_points(%s, %s, NULL) AS amount_credited", 
                                      (user_id, points), True, True)
        return {
            "success": True,
            "points_redeemed": points,
            "amount_credited": amount_credited["amount_credited"] if amount_credited else 0
        }
    except Exception as e:
        logger.error(f"Redeem rewards error: {e}")
        raise Exception(str(e))

def withdraw_funds(account_id, amount):
    """Withdraw funds from an account"""
    try:
        transaction_id = execute_query("SELECT * FROM withdraw_funds(%s, %s, NULL) AS transaction_id", 
                                      (account_id, amount), True, True)
        
        # Get the transaction details
        transaction = execute_function("get_account_transactions", (account_id,), True, False)
        return transaction[0] if transaction else None
    except Exception as e:
        logger.error(f"Withdraw funds error: {e}")
        raise Exception(str(e))

# Product and merchant operations
def create_merchant(user_id, business_name, business_category, name, email, contact=None):
    """Create a merchant"""
    try:
        merchant_id = execute_query("SELECT * FROM create_merchant(%s, %s, %s, %s, %s, %s, NULL) AS merchant_id", 
                                   (user_id, business_name, business_category, name, email, contact), True, True)
        
        # Get the merchant details
        merchant = execute_function("get_merchant_by_user", (user_id,), True, True)
        return merchant
    except Exception as e:
        logger.error(f"Create merchant error: {e}")
        raise Exception(str(e))

def get_merchant_profile(merchant_id):
    """Get merchant profile"""
    try:
        merchant = execute_function("get_merchant_profile", (merchant_id,), True, True)
        return merchant
    except Exception as e:
        logger.error(f"Get merchant profile error: {e}")
        raise Exception(str(e))

def get_merchant_by_user(user_id):
    """Get merchant by user ID"""
    try:
        merchant = execute_function("get_merchant_by_user", (user_id,), True, True)
        return merchant
    except Exception as e:
        logger.error(f"Get merchant by user error: {e}")
        raise Exception(str(e))

def update_merchant_profile(merchant_id, business_name=None, business_category=None, contact=None):
    """Update merchant profile"""
    try:
        execute_procedure("update_merchant_profile", (merchant_id, business_name, business_category, contact), False)
        return get_merchant_profile(merchant_id)
    except Exception as e:
        logger.error(f"Update merchant profile error: {e}")
        raise Exception(str(e))

def create_product(merchant_id, name, description, price, mrp, stock, business_category, image_url=None):
    """Create a product"""
    try:
        product_id = execute_query("SELECT * FROM create_product(%s, %s, %s, %s, %s, %s, %s, %s, NULL) AS product_id", 
                                  (merchant_id, name, description, price, mrp, stock, business_category, image_url), True, True)
        
        # Get the product details
        product = execute_function("get_product_by_id", (product_id["product_id"],), True, True)
        return product
    except Exception as e:
        logger.error(f"Create product error: {e}")
        raise Exception(str(e))

def get_all_products(limit=100, offset=0):
    """Get all products"""
    try:
        products = execute_function("get_all_products", (limit, offset), True, False)
        return products
    except Exception as e:
        logger.error(f"Get all products error: {e}")
        raise Exception(str(e))

def get_product_by_id(product_id):
    """Get a product by ID"""
    try:
        product = execute_function("get_product_by_id", (product_id,), True, True)
        return product
    except Exception as e:
        logger.error(f"Get product by ID error: {e}")
        raise Exception(str(e))

def get_merchant_products(merchant_id):
    """Get products by merchant ID"""
    try:
        products = execute_function("get_merchant_products", (merchant_id,), True, False)
        return products
    except Exception as e:
        logger.error(f"Get merchant products error: {e}")
        raise Exception(str(e))

def get_products_by_category(category):
    """Get products by category"""
    try:
        products = execute_function("get_products_by_category", (category,), True, False)
        return products
    except Exception as e:
        logger.error(f"Get products by category error: {e}")
        raise Exception(str(e))

def get_product_categories():
    """Get all product categories"""
    try:
        categories = execute_function("get_product_categories", (), True, False)
        return [category["category"] for category in categories] if categories else []
    except Exception as e:
        logger.error(f"Get product categories error: {e}")
        raise Exception(str(e))

def update_product(product_id, name=None, description=None, price=None, mrp=None, stock=None, 
                  business_category=None, image_url=None, status=None):
    """Update a product"""
    try:
        execute_procedure("update_product", (product_id, name, description, price, mrp, stock, 
                                           business_category, image_url, status), False)
        return get_product_by_id(product_id)
    except Exception as e:
        logger.error(f"Update product error: {e}")
        raise Exception(str(e))

def delete_product(product_id):
    """Delete a product"""
    try:
        execute_procedure("delete_product", (product_id,), False)
        return {"success": True, "message": "Product deleted successfully"}
    except Exception as e:
        logger.error(f"Delete product error: {e}")
        raise Exception(str(e))

# Cart operations
def add_to_cart(user_id, product_id, quantity=1):
    """Add item to cart"""
    try:
        execute_procedure("add_to_cart", (user_id, product_id, quantity), False)
        return get_user_cart(user_id)
    except Exception as e:
        logger.error(f"Add to cart error: {e}")
        raise Exception(str(e))

def update_cart_item(user_id, product_id, quantity):
    """Update cart item quantity"""
    try:
        execute_procedure("update_cart_item", (user_id, product_id, quantity), False)
        return get_user_cart(user_id)
    except Exception as e:
        logger.error(f"Update cart item error: {e}")
        raise Exception(str(e))

def remove_from_cart(user_id, product_id):
    """Remove item from cart"""
    try:
        execute_procedure("remove_from_cart", (user_id, product_id), False)
        return get_user_cart(user_id)
    except Exception as e:
        logger.error(f"Remove from cart error: {e}")
        raise Exception(str(e))

def get_user_cart(user_id):
    """Get user cart with items"""
    try:
        cart = execute_function("get_user_cart", (user_id,), True, True)
        return cart
    except Exception as e:
        logger.error(f"Get user cart error: {e}")
        raise Exception(str(e))

# Order operations
def create_order(user_id, account_id, payment_method, use_wallet=False, use_rewards=False, reward_points=0):
    """Create order from cart"""
    try:
        query = """
        DO $$
        DECLARE 
            v_order_id INTEGER;
            v_total_amount DECIMAL(10,2);
        BEGIN
            CALL create_order(%s, %s, %s, %s, %s, %s, v_order_id, v_total_amount);
            SELECT v_order_id, v_total_amount;
        END
        $$;
        """
        
        result = execute_query(query, (user_id, account_id, payment_method, use_wallet, use_rewards, reward_points), 
                             True, True)
        
        # Get the order details
        order = get_order_details(result["order_id"]) if result and "order_id" in result else None
        return order
    except Exception as e:
        logger.error(f"Create order error: {e}")
        raise Exception(str(e))

def get_order_details(order_id):
    """Get order details with items"""
    try:
        order = execute_function("get_order_details", (order_id,), True, True)
        return order
    except Exception as e:
        logger.error(f"Get order details error: {e}")
        raise Exception(str(e))

def get_user_orders(user_id):
    """Get all orders for a user"""
    try:
        orders = execute_function("get_user_orders", (user_id,), True, False)
        return orders
    except Exception as e:
        logger.error(f"Get user orders error: {e}")
        raise Exception(str(e))

# Admin operations
def get_admin_stats():
    """Get admin statistics"""
    try:
        stats = execute_function("get_admin_stats", (), True, True)
        return stats
    except Exception as e:
        logger.error(f"Get admin stats error: {e}")
        raise Exception(str(e))

def get_admin_logs(action=None, start_date=None, end_date=None):
    """Get system logs"""
    try:
        logs = execute_function("get_admin_logs", (action, start_date, end_date), True, False)
        return logs
    except Exception as e:
        logger.error(f"Get admin logs error: {e}")
        raise Exception(str(e))

def get_admin_orders():
    """Get all orders for admin"""
    try:
        orders = execute_function("get_admin_orders", (), True, False)
        return orders
    except Exception as e:
        logger.error(f"Get admin orders error: {e}")
        raise Exception(str(e))

def update_user_status(user_id, status, admin_id):
    """Block/unblock user"""
    try:
        execute_procedure("update_user_status", (user_id, status, admin_id), False)
        return {"success": True, "message": f"User status updated to {status}"}
    except Exception as e:
        logger.error(f"Update user status error: {e}")
        raise Exception(str(e))

def get_merchant_stats(merchant_id):
    """Get merchant statistics"""
    try:
        stats = execute_function("get_merchant_stats", (merchant_id,), True, True)
        return stats
    except Exception as e:
        logger.error(f"Get merchant stats error: {e}")
        raise Exception(str(e))

def get_merchant_logs(merchant_id):
    """Get merchant logs"""
    try:
        logs = execute_function("get_merchant_logs", (merchant_id,), True, False)
        return logs
    except Exception as e:
        logger.error(f"Get merchant logs error: {e}")
        raise Exception(str(e))

def get_featured_products(limit=8):
    """Get featured products for homepage"""
    try:
        products = execute_function("get_featured_products", (limit,), True, False)
        return products
    except Exception as e:
        logger.error(f"Get featured products error: {e}")
        raise Exception(str(e)) 