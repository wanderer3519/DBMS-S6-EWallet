from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DECIMAL, Enum, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum

Base = declarative_base()

# Enums
class UserRole(enum.Enum):
    customer = "customer"
    admin = "admin"
    merchant = "merchant"
    support = "support"

class UserStatus(enum.Enum):
    active = "active"
    blocked = "blocked"

class AccountType(enum.Enum):
    user = "user"
    merchant = "merchant"

class TransactionType(enum.Enum):
    top_up = "top-up"
    purchase = "purchase"
    withdrawal = "withdrawal"
    refund = "refund"
    reward_redemption = "reward_redemption"

class TransactionStatus(enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    reversed = "reversed"

class RefundStatus(enum.Enum):
    pending = "pending"
    completed = "completed"
    rejected = "rejected"

class RewardStatus(enum.Enum):
    earned = "earned"
    redeemed = "redeemed"
    expired = "expired"

# Tables
class User(Base):
    __tablename__ = "user"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String)
    full_name = Column(String)
    role = Column(Enum(UserRole))
    status = Column(Enum(UserStatus))
    created_at = Column(TIMESTAMP)
    password_hash = Column(String)

class Account(Base):
    __tablename__ = "account"
    account_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"))
    account_type = Column(Enum(AccountType))
    balance = Column(DECIMAL(10, 2))
    created_at = Column(TIMESTAMP)

class Transactions(Base):
    __tablename__ = "transactions"
    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("account.account_id"))
    amount = Column(DECIMAL(10, 2))
    transaction_type = Column(Enum(TransactionType))
    status = Column(Enum(TransactionStatus))
    created_at = Column(TIMESTAMP)

class Refunds(Base):
    __tablename__ = "refunds"
    refund_id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"))
    user_id = Column(Integer, ForeignKey("user.user_id"))
    amount = Column(DECIMAL(10, 2))
    status = Column(Enum(RefundStatus))
    created_at = Column(TIMESTAMP)

class Logs(Base):
    __tablename__ = "logs"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"))
    action = Column(String)
    description = Column(String)
    created_at = Column(TIMESTAMP)

class RewardPoints(Base):
    __tablename__ = "reward_points"
    reward_id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"))
    user_id = Column(Integer, ForeignKey("user.user_id"))
    points = Column(Integer)
    status = Column(Enum(RewardStatus))
    created_at = Column(TIMESTAMP)

class Merchants(Base):
    __tablename__ = "merchants"
    merchant_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"))
    business_name = Column(String)
    business_category = Column(String)
    created_at = Column(TIMESTAMP)

class Products(Base):
    __tablename__ = "products"
    product_id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.merchant_id"))
    name = Column(String)
    description = Column(String)
    price = Column(DECIMAL)
    stock = Column(Integer)
    created_at = Column(TIMESTAMP)

class Orders(Base):
    __tablename__ = "orders"
    order_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("account.account_id"))
    user_id = Column(Integer, ForeignKey("user.user_id"))
    merchant_id = Column(Integer, ForeignKey("merchants.merchant_id"))
    total_amount = Column(DECIMAL)
    status = Column(String)
    created_at = Column(TIMESTAMP)

class OrderItems(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    quantity = Column(Integer)
    price = Column(DECIMAL)

# Database connection
DATABASE_URL = "postgresql://Chakram:postgres@localhost/dbms-testing-1"

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)

print("Database tables created successfully!")
