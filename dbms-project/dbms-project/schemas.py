# from pydantic import BaseModel, EmailStr
# from typing import Optional, List, Dict, Any
# from datetime import datetime

# class Token(BaseModel):
#     access_token: str
#     token_type: str
#     user_id: Optional[int] = None
#     email: Optional[str] = None
#     role: Optional[str] = None
#     name: Optional[str] = None
#     account: Optional[Dict[str, Any]] = None

# class TokenData(BaseModel):
#     email: Optional[str] = None

# class UserBase(BaseModel):
#     email: EmailStr
#     full_name: str
#     phone: Optional[str] = None

# class UserCreate(UserBase):
#     password: str

# class User(UserBase):
#     id: int
#     role: str
#     is_active: bool
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class ProductBase(BaseModel):
#     name: str
#     description: str
#     price: float
#     mrp: float
#     stock: int
#     image_url: Optional[str] = None

# class ProductCreate(ProductBase):
#     merchant_id: int

# class Product(ProductBase):
#     id: int
#     merchant_id: int
#     status: str
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class CartItemBase(BaseModel):
#     product_id: int
#     quantity: int

# class CartItemCreate(CartItemBase):
#     pass

# class CartItem(CartItemBase):
#     id: int
#     cart_id: int
#     price: float
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class CartBase(BaseModel):
#     pass

# class CartCreate(CartBase):
#     pass

# class Cart(CartBase):
#     id: int
#     user_id: int
#     items: List[CartItem]
#     total_amount: float
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class OrderItemBase(BaseModel):
#     product_id: int
#     quantity: int
#     price: float

# class OrderItemCreate(OrderItemBase):
#     pass

# class OrderItem(OrderItemBase):
#     id: int
#     order_id: int
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class OrderBase(BaseModel):
#     shipping_address: str
#     payment_method: str

# class OrderCreate(OrderBase):
#     pass

# class Order(OrderBase):
#     id: int
#     user_id: int
#     items: List[OrderItem]
#     total_amount: float
#     status: str
#     created_at: datetime

#     class Config:
#         orm_mode = True

# class LogBase(BaseModel):
#     action: str
#     description: str

# class LogCreate(LogBase):
#     user_id: int

# class Log(LogBase):
#     id: int
#     user_id: int
#     created_at: datetime

#     class Config:
#         orm_mode = True 