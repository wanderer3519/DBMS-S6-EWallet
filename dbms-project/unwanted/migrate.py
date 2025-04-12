from sqlalchemy import create_engine, text
from models import Base
import os
from dotenv import load_dotenv

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

if __name__ == "__main__":
    run_migration() 