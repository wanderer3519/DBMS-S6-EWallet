from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
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
