import logging
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from api.database import engine
from api.models import (
    Account,
    AccountType,
    UserRole,
    Users,
    UserStatus,
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def populate_database():
    db = Session(engine)

    try:
        # Create sample users
        users = [
            Users(
                email="admin@example.com",
                full_name="Admin User",
                password_hash="hashed_password_1",  # In production, use proper hashing
                role=UserRole.admin,
                status=UserStatus.active,
                created_at=datetime.utcnow(),
            ),
            Users(
                email="merchant@example.com",
                full_name="Merchant User",
                password_hash="hashed_password_2",
                role=UserRole.merchant,
                status=UserStatus.active,
                created_at=datetime.utcnow(),
            ),
            Users(
                email="customer@example.com",
                full_name="Customer User",
                password_hash="hashed_password_3",
                role=UserRole.customer,
                status=UserStatus.active,
                created_at=datetime.utcnow(),
            ),
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
                created_at=datetime.utcnow(),
            )
            db.add(account)
        db.commit()

        logger.info("Database populated successfully!")

    except Exception as e:
        logger.info(f"Error populating database: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    populate_database()
