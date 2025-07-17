import enum

from sqlalchemy import (
    DECIMAL,
    TIMESTAMP,
    Column,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


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


class ProductStatus(enum.Enum):
    active = "active"
    inactive = "inactive"
    out_of_stock = "out_of_stock"


class OrderStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"


# Tables
class Users(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String)
    full_name = Column(String)
    role = Column(Enum(UserRole))
    status = Column(Enum(UserStatus))
    phone = Column(String(12), nullable=True)
    created_at = Column(TIMESTAMP)
    password_hash = Column(String)
    profile_image = Column(String(255), nullable=True)


class Account(Base):
    __tablename__ = "account"
    account_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
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
    user_id = Column(Integer, ForeignKey("users.user_id"))
    amount = Column(DECIMAL(10, 2))
    status = Column(Enum(RefundStatus))
    created_at = Column(TIMESTAMP)


class Logs(Base):
    __tablename__ = "logs"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    action = Column(String)
    description = Column(String)
    created_at = Column(TIMESTAMP)


class RewardPoints(Base):
    __tablename__ = "reward_points"
    reward_id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    points = Column(Integer)
    status = Column(Enum(RewardStatus))
    created_at = Column(TIMESTAMP)


class Merchants(Base):
    __tablename__ = "merchants"

    merchant_id = Column(Integer, autoincrement=True, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    business_name = Column(String)
    business_category = Column(String)
    created_at = Column(TIMESTAMP)
    name = Column(String(100))
    email = Column(String(100))
    contact = Column(String(12))
    updated_at = Column(TIMESTAMP)

    # __table_args__ = (PrimaryKeyConstraint("merchant_id", "business_category"),)


class Product(Base):
    __tablename__ = "products"
    product_id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.merchant_id"))
    name = Column(String(100))
    description = Column(Text)
    price = Column(DECIMAL(10, 2))
    mrp = Column(DECIMAL(10, 2))
    stock = Column(Integer)
    business_category = Column(String(50))
    image_url = Column(String(255))
    status = Column(Enum(ProductStatus), default=ProductStatus.active)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class Cart(Base):
    __tablename__ = "cart"
    cart_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class CartItem(Base):
    __tablename__ = "cart_items"
    cart_item_id = Column(Integer, primary_key=True, autoincrement=True)
    cart_id = Column(Integer, ForeignKey("cart.cart_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    quantity = Column(Integer)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class Order(Base):
    __tablename__ = "orders"
    order_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    account_id = Column(Integer, ForeignKey("account.account_id"))
    total_amount = Column(DECIMAL(10, 2))
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
    payment_method = Column(String(50), nullable=True)
    wallet_amount = Column(DECIMAL(10, 2), default=0)
    reward_discount = Column(DECIMAL(10, 2), default=0)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    quantity = Column(Integer)
    price_at_time = Column(DECIMAL(10, 2))
    created_at = Column(TIMESTAMP)


# # Database connection
# DATABASE_URL = "postgresql://postgres:postgres@localhost/dbms-testing-1"

# engine = create_engine(DATABASE_URL)
# Base.metadata.create_all(engine)

# logger.info("Database tables created successfully!")
