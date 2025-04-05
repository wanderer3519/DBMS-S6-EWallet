from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class WalletBase(BaseModel):
    balance: float

class WalletCreate(BaseModel):
    user_id: int

class WalletResponse(WalletBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

class TransactionBase(BaseModel):
    amount: float
    transaction_type: str

class TransactionCreate(TransactionBase):
    user_id: int

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


# Pydantic Schemas
# class UserCreate(BaseModel):
#     full_name: str
#     email: str
#     password_hash: str
#     role: str

# class TransactionCreate(BaseModel):
#     account_id: int
#     transaction_type: str
#     amount: float
