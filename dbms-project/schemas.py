from pydantic import BaseModel, EmailStr
from enum import Enum
from datetime import datetime
from typing import List, Optional
from models import UserRole, AccountType, TransactionType, TransactionStatus, ProductStatus, OrderStatus, UserStatus

# Pydantic Schemas
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer
    contact: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    

class TokenData(BaseModel):
    email: Optional[str] = None

class AccountCreate(BaseModel):
    account_type: AccountType = AccountType.user

class AccountResponse(BaseModel):
    account_id: int
    user_id: int
    account_type: AccountType
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

# Product Schemas
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: str

class ProductResponse(BaseModel):
    product_id: int
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: str
    status: ProductStatus

    class Config:
        from_attributes = True

# Cart Schemas
class CartItemCreate(BaseModel):
    product_id: int
    quantity: int

class CartResponse(BaseModel):
    cart_id: int
    items: List[dict]
    total_amount: float

    class Config:
        from_attributes = True

# Order Schemas
class OrderCreate(BaseModel):
    account_id: int

class OrderResponse(BaseModel):
    order_id: int
    total_amount: float
    status: OrderStatus
    items: List[dict]

    class Config:
        from_attributes = True

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
    accounts: List[AccountResponse]

    class Config:
        from_attributes = True

# User Update Schema
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

# Password Update Schema
class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

# Product Update Schema
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[ProductStatus] = None
