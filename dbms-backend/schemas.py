from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, UserStatus, AccountType, TransactionType, TransactionStatus, ProductStatus, OrderStatus
# Pydantic Schemas
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer
    contact: Optional[str] = None
    address: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[int] = None
    

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
    user_id: int
    account_id: int
    wallet_amount: Optional[float]
    reward_discount: float
    total_amount: float
    status: OrderStatus
    items: List[dict]
    created_at: datetime
    updated_at: datetime
    payment_method: Optional[str] = None
    reward_points_earned: int

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
    address: Optional[str] = None
    contact: Optional[str] = None                                                                                                                       

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
