import enum

from sqlalchemy import (
    DECIMAL,
    TIMESTAMP,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus), default=UserStatus.active
    )
    phone: Mapped[str | None] = mapped_column(String(12))
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    profile_image: Mapped[str | None] = mapped_column(String(255))


class Account(Base):
    __tablename__ = "account"

    account_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType), nullable=False)
    balance: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Transactions(Base):
    __tablename__ = "transactions"

    transaction_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.account_id"), nullable=False
    )
    amount: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType), nullable=False
    )
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.pending
    )
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Refunds(Base):
    __tablename__ = "refunds"

    refund_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    transaction_id: Mapped[int] = mapped_column(
        ForeignKey("transactions.transaction_id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    amount: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    status: Mapped[RefundStatus] = mapped_column(Enum(RefundStatus), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Logs(Base):
    __tablename__ = "logs"

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class RewardPoints(Base):
    __tablename__ = "reward_points"

    reward_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    transaction_id: Mapped[int] = mapped_column(
        ForeignKey("transactions.transaction_id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RewardStatus] = mapped_column(Enum(RewardStatus), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Merchants(Base):
    __tablename__ = "merchants"

    merchant_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    business_category: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    contact: Mapped[str] = mapped_column(String(12), nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    merchant_id: Mapped[int] = mapped_column(
        ForeignKey("merchants.merchant_id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    mrp: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False)
    business_category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus), default=ProductStatus.active
    )
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Cart(Base):
    __tablename__ = "cart"

    cart_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class CartItem(Base):
    __tablename__ = "cart_items"

    cart_item_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    cart_id: Mapped[int] = mapped_column(ForeignKey("cart.cart_id"), nullable=False)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.product_id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.account_id"), nullable=False
    )
    total_amount: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.pending
    )
    payment_method: Mapped[str | None] = mapped_column(String(50))
    wallet_amount: Mapped[float] = mapped_column(DECIMAL(10, 2), default=0)
    reward_discount: Mapped[float] = mapped_column(DECIMAL(10, 2), default=0)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.order_id"), nullable=False)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.product_id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_at_time: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP, nullable=False)
