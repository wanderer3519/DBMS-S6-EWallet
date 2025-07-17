import logging
import os
from datetime import datetime

from sqlalchemy.orm import Session

from api.auth_lib import get_password_hash
from api.database import engine
from api.models import Merchants, Product, ProductStatus, UserRole, Users, UserStatus

logger = logging.getLogger(__name__)


# Sample product data
sample_products = [
    {
        "name": "Smartphone X",
        "description": "Latest smartphone with amazing features",
        "price": 699.99,
        "mrp": 799.99,
        "stock": 50,
        "business_category": "Electronics",
        "image_url": "products/smartphone.jpg",
    },
    {
        "name": "Laptop Pro",
        "description": "High-performance laptop for professionals",
        "price": 1299.99,
        "mrp": 1499.99,
        "stock": 30,
        "business_category": "Electronics",
        "image_url": "products/laptop.jpg",
    },
    {
        "name": "Wireless Earbuds",
        "description": "Premium wireless earbuds with noise cancellation",
        "price": 149.99,
        "mrp": 199.99,
        "stock": 100,
        "business_category": "Electronics",
        "image_url": "products/earbuds.jpg",
    },
    {
        "name": "Smart Watch",
        "description": "Feature-rich smartwatch with health tracking",
        "price": 249.99,
        "mrp": 299.99,
        "stock": 75,
        "business_category": "Wearables",
        "image_url": "products/smartwatch.jpg",
    },
    {
        "name": "Gaming Console",
        "description": "Next-gen gaming console for ultimate gaming experience",
        "price": 499.99,
        "mrp": 549.99,
        "stock": 25,
        "business_category": "Gaming",
        "image_url": "products/console.jpg",
    },
]


def create_merchant_if_not_exists(db: Session):
    try:
        # Check if merchant exists
        merchant_email = "merchant@example.com"
        merchant = db.query(Users).filter(Users.email == merchant_email).first()
        merchant_profile = None

        if not merchant:
            logger.info("Creating new merchant user...")
            # Create merchant user
            merchant = Users(
                email=merchant_email,
                full_name="Sample Merchant",
                password_hash=get_password_hash("merchant123"),
                role=UserRole.merchant,
                status=UserStatus.active,
                created_at=datetime.utcnow(),
            )
            db.add(merchant)
            db.commit()
            db.refresh(merchant)
            logger.info(f"Created merchant user with ID: {merchant.user_id}")

        # Check if merchant profile exists
        merchant_profile = (
            db.query(Merchants).filter(Merchants.user_id == merchant.user_id).first()
        )

        if not merchant_profile:
            logger.info("Creating merchant profile...")
            # Create merchant profile
            merchant_profile = Merchants(
                user_id=merchant.user_id,
                business_name="Sample Electronics Store",
                business_category="Electronics",
                created_at=datetime.utcnow(),
            )
            db.add(merchant_profile)
            db.commit()
            db.refresh(merchant_profile)
            logger.info(
                f"Created merchant profile with ID: {merchant_profile.merchant_id}"
            )

        return merchant_profile

    except Exception as e:
        logger.info(f"Error creating merchant: {str(e)}")
        db.rollback()
        raise


def populate_products():
    db = Session(engine)
    try:
        logger.info("Starting product population...")
        # Create merchant
        merchant = create_merchant_if_not_exists(db)

        if not merchant:
            raise Exception("Failed to create or get merchant profile")

        logger.info(f"Using merchant ID: {merchant.merchant_id}")

        # Create uploads directory
        os.makedirs("uploads/products", exist_ok=True)

        # Add products
        for product_data in sample_products:
            try:
                # Check if product already exists
                existing_product = (
                    db.query(Product)
                    .filter(
                        Product.name == product_data["name"],
                        Product.merchant_id == merchant.merchant_id,
                    )
                    .first()
                )

                if not existing_product:
                    logger.info(f"Adding product: {product_data['name']}")
                    product = Product(
                        merchant_id=merchant.merchant_id,
                        name=product_data["name"],
                        description=product_data["description"],
                        price=product_data["price"],
                        mrp=product_data["mrp"],
                        stock=product_data["stock"],
                        business_category=product_data["business_category"],
                        image_url=product_data["image_url"],
                        status=ProductStatus.active,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(product)
                    db.commit()
                else:
                    logger.info(f"Product already exists: {product_data['name']}")

            except Exception as e:
                logger.info(f"Error adding product {product_data['name']}: {str(e)}")
                continue

        logger.info("Sample products added successfully!")
    except Exception as e:
        logger.info(f"Error populating products: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads/products", exist_ok=True)
    populate_products()
