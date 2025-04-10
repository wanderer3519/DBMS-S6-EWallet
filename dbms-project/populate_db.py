from sqlalchemy.orm import Session
from database import engine, get_db
from models import User, Product, Account, UserRole, UserStatus, ProductStatus, AccountType
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def populate_database():
    db = Session(engine)
    
    try:
        # Create sample users
        users = [
            User(
                email="admin@example.com",
                full_name="Admin User",
                password_hash="hashed_password_1",  # In production, use proper hashing
                role=UserRole.admin,
                status=UserStatus.active,
                created_at=datetime.now()
            ),
            User(
                email="merchant@example.com",
                full_name="Merchant User",
                password_hash="hashed_password_2",
                role=UserRole.merchant,
                status=UserStatus.active,
                created_at=datetime.now()
            ),
            User(
                email="customer@example.com",
                full_name="Customer User",
                password_hash="hashed_password_3",
                role=UserRole.customer,
                status=UserStatus.active,
                created_at=datetime.now()
            )
        ]
        
        for user in users:
            db.add(user)
        db.commit()
        
        # Create accounts for users
        for user in users:
            account = Account(
                user_id=user.user_id,
                account_type=AccountType.user,
                balance=1000.0,  # Initial balance
                created_at=datetime.now()
            )
            db.add(account)
        db.commit()
        
        # Create sample products
        products = [
            Product(
                name="Apple iPhone 14",
                description="Latest iPhone with A15 Bionic chip, 6.1-inch Super Retina XDR display, and advanced camera system",
                price=74999.00,
                mrp=79900.00,
                stock=50,
                image_url="/uploads/iphone14.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="Samsung Galaxy S23",
                description="Flagship Android phone with 108MP camera, Dynamic AMOLED display, and all-day battery life",
                price=69999.00,
                mrp=74900.00,
                stock=45,
                image_url="/uploads/galaxy-s23.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="Sony WH-1000XM4",
                description="Premium noise-cancelling headphones with exceptional sound quality and 30-hour battery life",
                price=24999.00,
                mrp=29900.00,
                stock=30,
                image_url="/uploads/sony-headphones.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="MacBook Air M2",
                description="13.6-inch laptop with M2 chip, up to 18 hours of battery life, and stunning Retina display",
                price=114999.00,
                mrp=119900.00,
                stock=25,
                image_url="/uploads/macbook-air.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="iPad Air 5th Gen",
                description="10.9-inch iPad with M1 chip, True Tone display, and support for Apple Pencil 2nd generation",
                price=54999.00,
                mrp=59900.00,
                stock=35,
                image_url="/uploads/ipad-air.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="OnePlus 11",
                description="Powerful Android phone with Snapdragon 8 Gen 2, 50MP Hasselblad camera, and 100W fast charging",
                price=56999.00,
                mrp=61900.00,
                stock=40,
                image_url="/uploads/oneplus11.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="Dell XPS 13",
                description="Premium ultrabook with InfinityEdge display, 12th Gen Intel Core processors, and all-day battery life",
                price=129999.00,
                mrp=134900.00,
                stock=20,
                image_url="/uploads/dell-xps13.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Product(
                name="Apple Watch Series 8",
                description="Advanced smartwatch with temperature sensing, crash detection, and ECG monitoring",
                price=41999.00,
                mrp=45900.00,
                stock=30,
                image_url="/uploads/apple-watch.jpg",
                status=ProductStatus.active,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        for product in products:
            db.add(product)
        db.commit()
        
        print("Database populated successfully!")
        
    except Exception as e:
        print(f"Error populating database: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_database() 