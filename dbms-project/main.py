""" 

Base.metadata.create_all(bind = engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()



def get_db():
    db = Sessionlocal()
    try:
        yield db
    finally:
        db.close()

@app.get('/')
def home():
    return {"message": "Hello world"}




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

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy.sql import text
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from database import engine, Base, get_db
from models import User, Account
from models import AccountType, UserRole, UserStatus
from schemas import UserCreate, Token, UserLogin

from auth import create_access_token, hash_password, verify_password



# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to ["http://localhost:3000"] for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints

@app.get('/')
def home():
    return {"message": "Hello world"}

@app.post("/signup", response_model=Token)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.execute(
        db.query(User).filter(User.email == user_data.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")


    new_user = User(
        full_name = user_data.full_name,
        email = user_data.email,
        password_hash = hash_password(user_data.password),
        role = UserRole.customer,
        status = UserStatus.active,
        created_at = datetime.now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_wallet = Account(
        user_id = new_user.user_id, 
        balance = 0.0,
        account_type = AccountType.user,
        created_at = datetime.now()
    )
    db.add(new_wallet)
    db.commit()
    db.refresh(new_wallet)

    access_token = create_access_token(data={"sub": new_user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}

# @app.post("/transactions/")
# def create_transaction(account_id: int, transaction_type: str, amount: float, db: Session = Depends(get_db)):
#     try:
#         query = text("INSERT INTO transactions (account_id, transaction_type, amount, status) VALUES (:account_id, :transaction_type, :amount, 'pending') RETURNING transaction_id")
#         result = db.execute(query, {"account_id": account_id, "transaction_type": transaction_type, "amount": amount})
#         db.commit()
        
#         transaction_id = result.fetchone()[0]  # Fetch the inserted transaction ID
#         return {"message": "Transaction created successfully", "transaction_id": transaction_id}
    
#     except Exception as e:
#         db.rollback()  # Rollback in case of error
#         raise HTTPException(status_code=400, detail=str(e))


# @app.get("/transactions/{account_id}")
# def fetch_transactions(account_id: int, db: Session = Depends(get_db)):
#     query = text("SELECT transaction_id, account_id, transaction_type, amount, status, created_at FROM transactions WHERE account_id = :account_id")
#     result = db.execute(query, {"account_id": account_id}).fetchall()

#     transactions_list = [
#         {"transaction_id": row[0], "account_id": row[1], "transaction_type": row[2], "amount": row[3], "status": row[4], "created_at": row[5]}
#         for row in result
#     ]

#     return {"transactions": transactions_list}


# @app.get("/reward-points/{account_id}")
# def get_reward_points(account_id: int, db: Session = Depends(get_db)):
#     query = text("SELECT reward_id, account_id, points, status, created_at FROM reward_points WHERE account_id = :account_id")
#     result = db.execute(query, {"account_id": account_id}).fetchall()

#     reward_points_list = [
#         {"reward_id": row[0], "account_id": row[1], "points": row[2], "status": row[3], "created_at": row[4]}
#         for row in result
#     ]

#     return {"reward_points": reward_points_list}


# @app.post("/redeem-rewards/")
# def redeem_rewards(account_id: int, points: int, db: Session = Depends(get_db)):
#     try:
#         query = text("SELECT redeem_rewards(:account_id, :points)")
#         db.execute(query, {"account_id": account_id, "points": points})
#         db.commit()
        
#         return {"message": "Reward points redeemed successfully"}
    
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=400, detail=str(e))


# @app.post("/process-withdrawal/")
# def process_withdrawal(account_id: int, amount: float, db: Session = Depends(get_db)):
#     try:
#         query = text("SELECT process_withdrawal(:account_id, :amount)")
#         db.execute(query, {"account_id": account_id, "amount": amount})
#         db.commit()
        
#         return {"message": "Withdrawal processed successfully"}
    
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=400, detail=str(e))