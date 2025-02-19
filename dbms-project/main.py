from fastapi import FastAPI,  Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware


from auth import hash_password, verify_password, create_access_token
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
        hashed_password=hash_password(user_data.password)
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
    access_token = create_access_token(data={"sub": user.username})
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

    return wallet