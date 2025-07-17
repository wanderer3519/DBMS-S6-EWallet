import logging
import os

import psycopg2
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    text,
)

from api.database import engine
from api.models import Base

logger = logging.getLogger(__name__)

load_dotenv()

# Database connection
database_url = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost/dbms-testing-1"
)


def run_migration():
    engine = create_engine(database_url)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Add any additional SQL commands if needed
    with engine.connect() as connection:
        # Check if tables exist before adding foreign key constraints
        connection.execute(
            text("""
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
        """)
        )

        connection.commit()

    logger.info("Database migration completed successfully!")


def migrate_orders_table():
    # Create a connection to the database
    connection = engine.connect()

    try:
        # Check if payment_method column exists
        result = connection.execute(
            text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='payment_method';
        """)
        )

        if result.rowcount == 0:
            logger.info("Adding payment_method column to orders table...")
            connection.execute(
                text("""
                ALTER TABLE orders
                ADD COLUMN payment_method VARCHAR(50) NULL;
            """)
            )
            logger.info("payment_method column added successfully!")
        else:
            logger.info("payment_method column already exists.")

        # Check if wallet_amount column exists
        result = connection.execute(
            text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='wallet_amount';
        """)
        )

        if result.rowcount == 0:
            logger.info("Adding wallet_amount column to orders table...")
            connection.execute(
                text("""
                ALTER TABLE orders
                ADD COLUMN wallet_amount DECIMAL(10, 2) DEFAULT 0;
            """)
            )
            logger.info("wallet_amount column added successfully!")
        else:
            logger.info("wallet_amount column already exists.")

        # Check if reward_discount column exists
        result = connection.execute(
            text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='reward_discount';
        """)
        )

        if result.rowcount == 0:
            logger.info("Adding reward_discount column to orders table...")
            connection.execute(
                text("""
                ALTER TABLE orders
                ADD COLUMN reward_discount DECIMAL(10, 2) DEFAULT 0;
            """)
            )
            logger.info("reward_discount column added successfully!")
        else:
            logger.info("reward_discount column already exists.")

        connection.commit()
        logger.info("Migration completed successfully!")

    except Exception as e:
        logger.info(f"Error during migration: {e}")
    finally:
        connection.close()


def get_db_connection():
    database_url = os.getenv(
        "database_url", "postgresql://postgres:postgres@localhost/wallet_db"
    )
    return psycopg2.connect(database_url)


def migrate_users_table():
    """
    Add profile_image column to the users table
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if profile_image column exists in users table
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='profile_image'"
        )
        if cur.fetchone() is None:
            logger.info("Adding profile_image column to users table...")
            cur.execute("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255)")
            logger.info("profile_image column added successfully.")
        else:
            logger.info("profile_image column already exists.")

        conn.commit()
        logger.info("Users table migration completed successfully.")
    except Exception as e:
        conn.rollback()
        logger.info(f"Error migrating users table: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
    migrate_orders_table()
    migrate_users_table()
