from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from api.models import (
    AccountType,
    OrderStatus,
    ProductStatus,
    TransactionStatus,
    TransactionType,
    UserRole,
    UserStatus,
)


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer
    contact: str | None = None
    address: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int | None = None


class TokenData(BaseModel):
    email: str | None = None


class AccountCreate(BaseModel):
    account_type: AccountType = AccountType.user


class AccountResponse(BaseModel):
    account_id: int
    user_id: int
    account_type: AccountType
    balance: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionCreate(BaseModel):
    account_id: int
    transaction_type: TransactionType
    amount: float


class TransactionResponse(BaseModel):
    transaction_id: int
    account_id: int
    amount: float
    transaction_type: TransactionType
    status: TransactionStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Product Schemas
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: str
    business_category: str


class ProductResponse(BaseModel):
    product_id: int
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: str
    status: ProductStatus
    business_category: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Cart Schemas
class CartItemCreate(BaseModel):
    product_id: int
    quantity: int


class CartResponse(BaseModel):
    cart_id: int
    items: list[dict]
    total_amount: float

    model_config = ConfigDict(from_attributes=True)


# Order Schemas
class OrderCreate(BaseModel):
    account_id: int


class OrderResponse(BaseModel):
    order_id: int
    user_id: int
    account_id: int
    wallet_amount: float | None
    reward_discount: float
    total_amount: float
    status: OrderStatus
    items: list[dict]
    created_at: datetime
    updated_at: datetime
    payment_method: str | None = None
    reward_points_earned: int

    model_config = ConfigDict(from_attributes=True)


# Admin Stats Schema
class AdminStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: float
    active_merchants: int


# User Profile Response Schema
class UserProfileResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    accounts: list[AccountResponse]
    address: str | None = None
    contact: str | None = None

    model_config = ConfigDict(from_attributes=True)


# User Update Schema
class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None


# Password Update Schema
class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


# Product Update Schema
class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    mrp: float | None = None
    stock: int | None = None
    image_url: str | None = None
    status: ProductStatus | None = None
