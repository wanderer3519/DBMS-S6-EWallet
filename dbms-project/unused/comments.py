# MAIN.py

""" from fastapi import FastAPI,  Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware


from auth import get_password_hash, verify_password, create_access_token
from database import engine, Sessionlocal
from models import *
from schemas import *


Base.metadata.create_all(bind = engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to ["http://localhost:3000"] for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = Sessionlocal()
    try:
        yield db
    finally:
        db.close()

@app.get('/')
def home():
    return {"message": "Hello world"}


@app.post("/signup", response_model=Token)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.execute(
        db.query(User).filter(User.username == user_data.username)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_wallet = Wallet(user_id=new_user.id, balance=0.0)
    db.add(new_wallet)
    db.commit()
    db.refresh(new_wallet)

    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/wallet/top-up", response_model=WalletResponse)
def top_up_wallet(transaction: TransactionCreate, db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()

    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    wallet.balance += transaction.amount

    new_transaction = Transaction(
        user_id=transaction.user_id,
        amount=transaction.amount,
        transaction_type="top-up"
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(wallet)

    return wallet

@app.get("/wallet/{user_id}", response_model=WalletResponse)
def get_wallet_balance(user_id: int, db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()

    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    return wallet """


# Models.py

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
