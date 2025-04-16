from sqlalchemy import create_engine, text
from models import Base
import os
from dotenv import load_dotenv
import os
from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, Enum, TIMESTAMP, Text, MetaData, Table
from sqlalchemy.ext.declarative import declarative_base
from database import engine, Base, get_db
import psycopg2

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/dbms-testing-1")

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Add any additional SQL commands if needed
    with engine.connect() as connection:
        # Check if tables exist before adding foreign key constraints
        connection.execute(text("""
            DO $$
            BEGIN
                -- Add foreign key constraints if they don't exist
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'cart_user_id_fkey'
                ) THEN
                    ALTER TABLE cart ADD CONSTRAINT cart_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES "user" (user_id);
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'cart_items_cart_id_fkey'
                ) THEN
                    ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_fkey 
                    FOREIGN KEY (cart_id) REFERENCES cart (cart_id);
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'cart_items_product_id_fkey'
                ) THEN
                    ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey 
                    FOREIGN KEY (product_id) REFERENCES products (product_id);
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'order_items_order_id_fkey'
                ) THEN
                    ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey 
                    FOREIGN KEY (order_id) REFERENCES orders (order_id);
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'order_items_product_id_fkey'
                ) THEN
                    ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey 
                    FOREIGN KEY (product_id) REFERENCES products (product_id);
                END IF;
            END $$;
        """))
        
        connection.commit()
    
    print("Database migration completed successfully!")

def migrate_orders_table():
    # Create a connection to the database
    connection = engine.connect()
    
    try:
        # Check if payment_method column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='payment_method';
        """))
        
        if result.rowcount == 0:
            print("Adding payment_method column to orders table...")
            connection.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN payment_method VARCHAR(50) NULL;
            """))
            print("payment_method column added successfully!")
        else:
            print("payment_method column already exists.")
        
        # Check if wallet_amount column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='wallet_amount';
        """))
        
        if result.rowcount == 0:
            print("Adding wallet_amount column to orders table...")
            connection.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN wallet_amount DECIMAL(10, 2) DEFAULT 0;
            """))
            print("wallet_amount column added successfully!")
        else:
            print("wallet_amount column already exists.")
        
        # Check if reward_discount column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='reward_discount';
        """))
        
        if result.rowcount == 0:
            print("Adding reward_discount column to orders table...")
            connection.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN reward_discount DECIMAL(10, 2) DEFAULT 0;
            """))
            print("reward_discount column added successfully!")
        else:
            print("reward_discount column already exists.")
            
        connection.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        connection.close()

def get_db_connection():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/wallet_db")
    return psycopg2.connect(DATABASE_URL)

def migrate_users_table():
    """
    Add profile_image column to the users table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if profile_image column exists in users table
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='profile_image'")
        if cur.fetchone() is None:
            print("Adding profile_image column to users table...")
            cur.execute("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255)")
            print("profile_image column added successfully.")
        else:
            print("profile_image column already exists.")
        
        conn.commit()
        print("Users table migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error migrating users table: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
    migrate_orders_table()
    migrate_users_table()