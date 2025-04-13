from database import engine, Base
from models import Users, Merchants, Product, Cart, CartItem, Order, OrderItem
import os

def init_db():
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise

from sqlalchemy import inspect

def check_tables():
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        print("\nExisting tables in database:")
        if existing_tables:
            for table in existing_tables:
                print(f"- {table}")
        else:
            print("No tables found.")
    except Exception as e:
        print(f"Error checking tables: {e}")


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    check_tables()
    print("\nDatabase initialization complete!") 