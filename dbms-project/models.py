# """ from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
# from sqlalchemy.orm import relationship
# from database import Base

# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, index=True)
#     username = Column(String, unique=True, index=True, nullable=False)
#     email = Column(String, unique=True, index=True, nullable=False)
#     hashed_password = Column(String, nullable=False)
#     role = Column(String, default="customer")  

#     wallet = relationship("Wallet", uselist=False, back_populates="user")
#     transactions = relationship("Transaction", back_populates="user")

# class Wallet(Base):
#     __tablename__ = "wallets"

#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
#     balance = Column(Float, default=0.0)

#     user = relationship("User", back_populates="wallet")

# class Transaction(Base):
#     __tablename__ = "transactions"

#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
#     amount = Column(Float, nullable=False)
#     transaction_type = Column(String, nullable=False)  # "top-up" or "purchase"
#     timestamp = Column(DateTime, default=func.now())

#     user = relationship("User", back_populates="transactions") """

# from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DECIMAL, TIMESTAMP, func
# from sqlalchemy.orm import relationship
# from database import Base

# class User(Base):
#     __tablename__ = "users"

#     user_id = Column(Integer, primary_key=True, index=True)
#     full_name = Column(String, nullable=False)
#     email = Column(String, unique=True, nullable=False)
#     password_hash = Column(String, nullable=False)
#     role = Column(Enum("customer", "admin", "merchant", "support", name="user_roles"), nullable=False)
#     status = Column(Enum("active", "blocked", name="user_status"), default="active")
#     created_at = Column(TIMESTAMP, default=func.now())

#     accounts = relationship("Account", back_populates="user")
#     logs = relationship("Log", back_populates="user")


# class Account(Base):
#     __tablename__ = "accounts"

#     account_id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
#     account_type = Column(Enum("wallet", "merchant", name="account_types"), nullable=False)
#     balance = Column(DECIMAL(10, 2), default=0.00)
#     created_at = Column(TIMESTAMP, default=func.now())

#     user = relationship("User", back_populates="accounts")
#     transactions = relationship("Transaction", back_populates="account")
#     orders = relationship("Order", back_populates="account")
#     reward_points = relationship("RewardPoint", back_populates="account")
#     refunds = relationship("Refund", back_populates="account")


# class Transaction(Base):
#     __tablename__ = "transactions"

#     transaction_id = Column(Integer, primary_key=True, index=True)
#     account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=False)
#     transaction_type = Column(Enum("top-up", "purchase", "withdrawal", "refund", "reward_redemption", name="transaction_types"), nullable=False)
#     amount = Column(DECIMAL(10, 2), nullable=False)
#     status = Column(Enum("pending", "completed", "failed", "reversed", name="transaction_statuses"), default="pending")
#     created_at = Column(TIMESTAMP, default=func.now())

#     account = relationship("Account", back_populates="transactions")
#     reward_points = relationship("RewardPoint", back_populates="transaction")
#     refund = relationship("Refund", back_populates="transaction")


# class Merchant(Base):
#     __tablename__ = "merchants"

#     merchant_id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
#     business_name = Column(String, nullable=False)
#     business_category = Column(String)
#     created_at = Column(TIMESTAMP, default=func.now())

#     products = relationship("Product", back_populates="merchant")
#     orders = relationship("Order", back_populates="merchant")


# class Product(Base):
#     __tablename__ = "products"

#     product_id = Column(Integer, primary_key=True, index=True)
#     merchant_id = Column(Integer, ForeignKey("merchants.merchant_id"), nullable=False)
#     name = Column(String, nullable=False)
#     description = Column(String)
#     price = Column(DECIMAL(10, 2), nullable=False)
#     stock = Column(Integer, nullable=False)
#     created_at = Column(TIMESTAMP, default=func.now())

#     merchant = relationship("Merchant", back_populates="products")
#     order_items = relationship("OrderItem", back_populates="product")


# class Order(Base):
#     __tablename__ = "orders"

#     order_id = Column(Integer, primary_key=True, index=True)
#     account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=False)
#     merchant_id = Column(Integer, ForeignKey("merchants.merchant_id"), nullable=False)
#     total_amount = Column(DECIMAL(10, 2), nullable=False)
#     status = Column(Enum("pending", "completed", "canceled", "refunded", name="order_statuses"), default="pending")
#     created_at = Column(TIMESTAMP, default=func.now())

#     account = relationship("Account", back_populates="orders")
#     merchant = relationship("Merchant", back_populates="orders")
#     order_items = relationship("OrderItem", back_populates="order")


# class OrderItem(Base):
#     __tablename__ = "order_items"

#     order_item_id = Column(Integer, primary_key=True, index=True)
#     order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
#     product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
#     quantity = Column(Integer, nullable=False)
#     price = Column(DECIMAL(10, 2), nullable=False)

#     order = relationship("Order", back_populates="order_items")
#     product = relationship("Product", back_populates="order_items")


# class RewardPoint(Base):
#     __tablename__ = "reward_points"

#     reward_id = Column(Integer, primary_key=True, index=True)
#     account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=False)
#     points = Column(Integer, nullable=False)
#     transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"))
#     status = Column(Enum("earned", "redeemed", "expired", name="reward_statuses"), default="earned")
#     created_at = Column(TIMESTAMP, default=func.now())

#     account = relationship("Account", back_populates="reward_points")
#     transaction = relationship("Transaction", back_populates="reward_points")


# class Refund(Base):
#     __tablename__ = "refunds"

#     refund_id = Column(Integer, primary_key=True, index=True)
#     transaction_id = Column(Integer, ForeignKey("transactions.transaction_id"), nullable=False)
#     account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=False)
#     amount = Column(DECIMAL(10, 2), nullable=False)
#     status = Column(Enum("pending", "completed", "rejected", name="refund_statuses"), default="pending")
#     created_at = Column(TIMESTAMP, default=func.now())

#     transaction = relationship("Transaction", back_populates="refund")
#     account = relationship("Account", back_populates="refunds")


# class Log(Base):
#     __tablename__ = "logs"

#     log_id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.user_id"))
#     action = Column(String, nullable=False)
#     description = Column(String)
#     created_at = Column(TIMESTAMP, default=func.now())

#     user = relationship("User", back_populates="logs")


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
