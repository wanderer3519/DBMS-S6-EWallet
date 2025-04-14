from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, UserStatus, AccountType, TransactionType, TransactionStatus, ProductStatus, OrderStatus

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    user_id: int
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class AccountBase(BaseModel):
    account_type: AccountType
    balance: float

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    account_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    transaction_type: TransactionType

class TransactionCreate(TransactionBase):
    account_id: int

class TransactionResponse(TransactionBase):
    transaction_id: int
    account_id: int
    status: TransactionStatus
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: str

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[ProductStatus] = None

class ProductResponse(BaseModel):
    product_id: int
    merchant_id: int
    name: str
    description: str
    price: float
    mrp: float
    stock: int
    image_url: Optional[str] = None
    status: ProductStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CartItemBase(BaseModel):
    product_id: int
    quantity: int
    user_id: int

class CartItemCreate(CartItemBase):
    pass

class CartItemResponse(CartItemBase):
    cart_item_id: int
    cart_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    cart_id: int
    user_id: int
    items: List[CartItemResponse] = []
    total_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price_at_time: float

class OrderItemResponse(OrderItemBase):
    order_item_id: int
    order_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    account_id: int

class OrderResponse(BaseModel):
    order_id: int
    user_id: int
    account_id: int
    status: OrderStatus
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

class LogResponse(BaseModel):
    log_id: int
    user_id: int
    action: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

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

class AdminStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: float
    active_merchants: int
