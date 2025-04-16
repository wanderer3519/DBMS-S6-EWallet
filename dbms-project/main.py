from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Body
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import Users, UserRole, UserStatus, Product, Cart, CartItem, Order, OrderItem, ProductStatus, OrderStatus, Account, AccountType, Transactions, TransactionType, TransactionStatus, Logs, Merchants, RewardPoints, RewardStatus
from pydantic import BaseModel, EmailStr
from sqlalchemy.sql import text
from datetime import datetime, timedelta
from auth import get_password_hash, verify_password, create_access_token, get_current_user, get_current_active_user, get_current_admin_user, get_current_merchant_user
from typing import Optional, List
import shutil
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uuid
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from sqlalchemy import func
import schemas
from file_upload import save_uploaded_file, delete_file
import base64
from decimal import Decimal

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount static files directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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

# API Endpoints
@app.get('/')
def home():
    return {"message": "Hello! This is Chakradhar Reddy"}

@app.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Start a transaction
        db.begin()
        
        # Check if user already exists
        db_user = db.query(Users).filter(Users.email == user.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user.password)
        db_user = Users(
            email=user.email,
            full_name=user.full_name,
            password_hash=hashed_password,
            role=user.role,
            status=UserStatus.active,
            created_at=datetime.utcnow()
        )
        
        db.add(db_user)
        db.flush()  # Get the user_id without committing
        
        # Create account for new user with zero balance
        account = Account(
            user_id=db_user.user_id,
            account_type=AccountType.user,
            balance=0.0,
            created_at=datetime.utcnow()
        )
        db.add(account)
        
        # Log user creation
        log = Logs(
            user_id=db_user.user_id,
            action="user_creation",
            description=f"User {user.email} created with role {user.role}",
            created_at=datetime.utcnow()
        )
        db.add(log)
        
        # Commit all changes
        db.commit()
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.email}
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        # Rollback on error
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        # Find user by email
        users = db.query(Users).filter(Users.email == user_data.email).first()
        if not users:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not verify_password(user_data.password, users.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": users.email}
        )
        
        # Log login
        log = Logs(
            user_id=users.user_id,
            action="user_login",
            description=f"User {users.email} logged in",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        
        # Get user's account
        account = db.query(Account).filter(Account.user_id == users.user_id).first()
        
        # Return token with user and account information
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": users.user_id,
            "email": users.email,
            "role": users.role,
            "name": users.full_name,
            "account": {
                "id": account.account_id if account else None,
                "balance": float(account.balance) if account else 0.0
            }
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

# Account Management Endpoints
@app.post("/accounts/", response_model=AccountResponse)
def create_account(account: AccountCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new account
    db_account = Account(
        user_id=user_id,
        account_type=account.account_type,
        balance=0.0,
        created_at=datetime.utcnow()
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    # Log account creation
    log = Logs(
        user_id=user_id,
        action="account_creation",
        description=f"Account {db_account.account_id} created for user {user.email}",
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    
    return db_account

@app.get("/accounts/{user_id}", response_model=List[AccountResponse])
def get_user_accounts(user_id: int, db: Session = Depends(get_db)):
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    return accounts

@app.post("/accounts/{account_id}/top-up", response_model=TransactionResponse)
def top_up_account(account_id: int, amount: float, db: Session = Depends(get_db)):
    # Check if account exists
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Create transaction
    transaction = Transactions(
        account_id=account_id,
        amount=amount,
        transaction_type=TransactionType.top_up,
        status=TransactionStatus.completed,
        created_at=datetime.utcnow()
    )
    
    db.add(transaction)
    
    # Update account balance
    account.balance += amount
    
    # Log transaction
    log = Logs(
        user_id=account.user_id,
        action="account_top_up",
        description=f"Account {account_id} topped up with {amount}",
        created_at=datetime.utcnow()
    )
    db.add(log)
    
    db.commit()
    db.refresh(transaction)
    
    return transaction

@app.post("/transactions/", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    try:
        # Check if account exists
        account = db.query(Account).filter(Account.account_id == transaction.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Create transaction
        db_transaction = Transactions(
            account_id=transaction.account_id,
            amount=transaction.amount,
            transaction_type=transaction.transaction_type,
            status=TransactionStatus.pending,
            created_at=datetime.utcnow()
        )
        
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        
        # Log transaction
        log = Logs(
            user_id=account.user_id,
            action="transaction_creation",
            description=f"Transaction {db_transaction.transaction_id} created for account {transaction.account_id}",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        
        return db_transaction
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/transactions/{account_id}", response_model=List[TransactionResponse])
def fetch_transactions(account_id: int, db: Session = Depends(get_db)):
    transactions = db.query(Transactions).filter(Transactions.account_id == account_id).all()
    return transactions

@app.get("/reward-points/{account_id}")
def get_reward_points(account_id: int, db: Session = Depends(get_db)):
    query = text("SELECT reward_id, account_id, points, status, created_at FROM reward_points WHERE account_id = :account_id")
    result = db.execute(query, {"account_id": account_id}).fetchall()

    reward_points_list = [
        {"reward_id": row[0], "account_id": row[1], "points": row[2], "status": row[3], "created_at": row[4]}
        for row in result
    ]

    return {"reward_points": reward_points_list}

@app.post("/redeem-rewards/")
def redeem_rewards(account_id: int, points: int, db: Session = Depends(get_db)):
    try:
        query = text("SELECT redeem_rewards(:account_id, :points)")
        db.execute(query, {"account_id": account_id, "points": points})
        db.commit()
        
        return {"message": "Reward points redeemed successfully"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/process-withdrawal/")
def process_withdrawal(account_id: int, amount: float, db: Session = Depends(get_db)):
    try:
        query = text("SELECT process_withdrawal(:account_id, :amount)")
        db.execute(query, {"account_id": account_id, "amount": amount})
        db.commit()
        
        return {"message": "Withdrawal processed successfully"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
# Product Endpoints
@app.post("/products/", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    merchant_id: int,
    db: Session = Depends(get_db)
):
    try:
        # Validate merchant exists
        merchant = db.query(Merchants).filter(Merchants.user_id == merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant not found")

        # Validate business category
        if not product.business_category:
            raise HTTPException(status_code=400, detail="Business category is required")

        # Create product object
        db_product = Product(
            name=product.name,
            description=product.description,
            price=product.price,
            mrp=product.mrp,
            stock=product.stock,
            business_category=product.business_category,
            merchant_id=merchant_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Save product
        db.add(db_product)
        db.commit()
        db.refresh(db_product)

        # Handle image upload if provided
        if product.image_url:
            try:
                image_data = base64.b64decode(product.image_url.split(',')[1])
                image_path = f"uploads/{db_product.product_id}.jpg"
                with open(image_path, "wb") as f:
                    f.write(image_data)
                db_product.image_url = f"/uploads/{db_product.product_id}.jpg"
                db.commit()
            except Exception as e:
                # Log the error but don't fail the product creation
                print(f"Error saving image: {str(e)}")

        return db_product
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products/", response_model=List[ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(Product).offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

@app.get("/products/merchant/{merchant_id}", response_model=List[ProductResponse])
def get_merchant_products(merchant_id: int, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
    return products

@app.post("/products/upload-image/")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user)
):
    if current_user.role != "merchant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can upload product images"
        )
    
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{current_user.id}.{file_extension}"
    file_path = os.path.join("uploads", filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL for the uploaded image
    return {"url": f"/uploads/{filename}"}

# Cart Endpoints
@app.post("/api/cart/add", response_model=CartResponse)
async def add_to_cart(
    item: CartItemCreate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get or create cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            cart = Cart(
                user_id=current_user.user_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(cart)
            db.commit()
            db.refresh(cart)
        
        # Check product exists and has stock
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        
        # Add or update cart item
        cart_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == item.product_id
        ).first()
        
        if cart_item:
            cart_item.quantity += item.quantity
            cart_item.updated_at = datetime.utcnow()
        else:
            cart_item = CartItem(
                cart_id=cart.cart_id,
                product_id=item.product_id,
                quantity=item.quantity,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(cart_item)
        
        db.commit()
        
        # Calculate total and get updated cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        total = 0
        items = []
        
        for cart_item in cart_items:
            product = db.query(Product).filter(Product.product_id == cart_item.product_id).first()
            if product:
                total += cart_item.quantity * product.price
                items.append({
                    "product_id": cart_item.product_id,
                    "quantity": cart_item.quantity,
                    "price": product.price,
                    "name": product.name,
                    "image_url": product.image_url
                })
        
        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} added product {item.product_id} to cart",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        
        return {
            "cart_id": cart.cart_id,
            "items": items,
            "total_amount": total
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cart/{user_id}", response_model=CartResponse)
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        return {"cart_id": 0, "items": [], "total_amount": 0}
    
    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    total = 0
    items = []
    
    for item in cart_items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if product:
            total += item.quantity * product.price
            items.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": product.price,
                "name": product.name
            })
    
    return {
        "cart_id": cart.cart_id,
        "items": items,
        "total_amount": total
    }

@app.delete("/api/cart/{product_id}")
async def remove_from_cart(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Find and delete the cart item
        cart_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == product_id
        ).first()
        
        if not cart_item:
            raise HTTPException(status_code=404, detail="Item not found in cart")
        
        db.delete(cart_item)
        
        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} removed product {product_id} from cart",
            created_at=datetime.utcnow()
        )
        db.add(log)
        
        db.commit()
        return {"message": "Item removed from cart successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cart", response_model=CartResponse)
async def get_current_user_cart(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            return {
                "cart_id": 0,
                "user_id": current_user.user_id,
                "items": [],
                "total_amount": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        
        # Get cart items with product details
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        items = []
        total = 0
        
        for item in cart_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if product:
                total += item.quantity * product.price
                items.append({
                    "cart_item_id": item.cart_item_id,
                    "cart_id": item.cart_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "user_id": current_user.user_id,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "name": product.name,
                    "price": product.price,
                    "image_url": product.image_url,
                    "category": product.business_category
                })
        
        return {
            "cart_id": cart.cart_id,
            "user_id": current_user.user_id,
            "items": items,
            "total_amount": total,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/cart/{product_id}", response_model=CartResponse)
async def update_cart_item(
    product_id: int,
    quantity: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Check product exists and has stock
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        
        # Update cart item
        cart_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.cart_id,
            CartItem.product_id == product_id
        ).first()
        
        if not cart_item:
            raise HTTPException(status_code=404, detail="Item not found in cart")
        
        cart_item.quantity = quantity
        cart_item.updated_at = datetime.utcnow()
        
        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} updated quantity of product {product_id} to {quantity}",
            created_at=datetime.utcnow()
        )
        db.add(log)
        
        db.commit()
        
        # Get updated cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        total = 0
        items = []
        
        for item in cart_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if product:
                total += item.quantity * product.price
                items.append({
                    "cart_item_id": item.cart_item_id,
                    "cart_id": item.cart_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "user_id": current_user.user_id,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "name": product.name,
                    "price": product.price,
                    "image_url": product.image_url,
                    "category": product.business_category
                })
        
        return {
            "cart_id": cart.cart_id,
            "user_id": current_user.user_id,
            "items": items,
            "total_amount": total,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Order Endpoints
@app.post("/orders/", response_model=OrderResponse)
def create_order(
    order: OrderCreate,
    payment_method: str = Body(...),
    use_wallet: bool = Body(False),
    use_rewards: bool = Body(False),
    reward_points: Optional[int] = Body(None),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")

        # Calculate total amount
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        total = 0
        order_items = []
        for cart_item in cart_items:
            product = db.query(Product).filter(Product.product_id == cart_item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {cart_item.product_id} not found")
            
            if product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for product {product.name}"
                )
            
            total += product.price * cart_item.quantity
            order_items.append((product, cart_item.quantity))

        # Apply rewards if requested
        reward_discount = 0
        if use_rewards and reward_points:
            available_rewards = db.query(RewardPoints).filter(
                RewardPoints.user_id == current_user.user_id,
                RewardPoints.status == RewardStatus.earned
            ).all()
            total_points = sum(reward.points for reward in available_rewards)

            if reward_points > total_points:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient reward points. Available: {total_points}"
                )

            reward_discount = float(reward_points * 0.1)
            total -= reward_discount

        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Handle wallet payment
        wallet_amount = 0
        remaining_amount = total
        if use_wallet:
            wallet_amount = min(account.balance, total)
            remaining_amount = total - wallet_amount

            if wallet_amount > 0:
                # Deduct from wallet
                account.balance -= wallet_amount

                # Create wallet transaction
                wallet_transaction = Transactions(
                    account_id=account.account_id,
                    amount=wallet_amount,
                    transaction_type=TransactionType.purchase,
                    status=TransactionStatus.completed,
                    created_at=datetime.utcnow()
                )
                db.add(wallet_transaction)

        # Handle remaining amount with other payment method if needed
        if remaining_amount > 0 and payment_method not in ['card', 'upi']:
            raise HTTPException(
                status_code=400,
                detail="Invalid payment method for remaining amount"
            )

        # Create order
        db_order = Order(
            user_id=current_user.user_id,
            total_amount=total,
            wallet_amount=wallet_amount,
            reward_discount=reward_discount,
            payment_method=payment_method,
            status=OrderStatus.completed,
            created_at=datetime.utcnow()
        )
        db.add(db_order)
        db.flush()

        # Create order items and update product stock
        for product, quantity in order_items:
            order_item = OrderItem(
                order_id=db_order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                price=product.price
            )
            db.add(order_item)
            
            # Update product stock
            product.stock -= quantity

        # Add reward points (5% of total amount before discount)
        earned_points = int((total + reward_discount) * 0.05)  # 5% of original total
        if earned_points > 0 and payment_method != 'cod':
            reward = RewardPoints(
                transaction_id=db_order.order_id,
                user_id=current_user.user_id,
                points=earned_points,
                status=RewardStatus.earned,
                created_at=datetime.utcnow()
            )
            db.add(reward)
            
            # AUTO-CONVERSION: Immediately convert earned points to wallet balance
            # Calculate reward value (1 point = ₹0.1)
            reward_value = float(earned_points * 0.1)
            
            # Add to account balance
            account.balance += reward_value
            
            # Update reward points status to redeemed
            reward.status = RewardStatus.redeemed
            
            # Create transaction for automatic reward redemption
            auto_redeem_transaction = Transactions(
                account_id=account.account_id,
                amount=reward_value,
                transaction_type=TransactionType.reward_redemption,
                status=TransactionStatus.completed,
                created_at=datetime.utcnow()
            )
            db.add(auto_redeem_transaction)
            
            # Log automatic redemption
            auto_redeem_log = Logs(
                user_id=current_user.user_id,
                action="auto_reward_redemption",
                description=f"Automatically redeemed {earned_points} points for ₹{reward_value}",
                created_at=datetime.utcnow()
            )
            db.add(auto_redeem_log)

        # Process reward points redemption if used
        if use_rewards and reward_points:
            points_to_redeem = reward_points
            for reward in available_rewards:
                if points_to_redeem <= 0:
                    break
                
                if reward.points <= points_to_redeem:
                    reward.status = RewardStatus.redeemed
                    points_to_redeem -= reward.points
                else:
                    # Split the reward point record
                    remaining_points = reward.points - points_to_redeem
                    reward.points = points_to_redeem
                    reward.status = RewardStatus.redeemed
                    
                    new_reward = RewardPoints(
                        transaction_id=reward.transaction_id,
                        user_id=reward.user_id,
                        points=remaining_points,
                        status=RewardStatus.earned,
                        created_at=datetime.utcnow()
                    )
                    db.add(new_reward)
                    points_to_redeem = 0

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()

        # Log order
        log = Logs(
            user_id=current_user.user_id,
            action="order_creation",
            description=f"Order {db_order.order_id} created. Total: ₹{total}, Wallet: ₹{wallet_amount}, Rewards: ₹{reward_discount}",
            created_at=datetime.utcnow()
        )
        db.add(log)

        db.commit()

        # Get order items with product details
        items = []
        for item in order_items:
            product = item[0]
            quantity = item[1]
            items.append({
                "order_item_id": 0,  # Will be set by the database
                "order_id": db_order.order_id,
                "product_id": product.product_id,
                "quantity": quantity,
                "price_at_time": float(product.price),
                "created_at": datetime.utcnow(),
                "name": product.name,
                "image_url": product.image_url
            })

        return {
            "order_id": db_order.order_id,
            "user_id": current_user.user_id,
            "account_id": account.account_id,
            "status": db_order.status,
            "total_amount": total,
            "created_at": db_order.created_at,
            "updated_at": db_order.created_at,
            "items": items,
            "reward_points_earned": earned_points if payment_method != 'cod' else 0,
            "payment_method": payment_method
        }

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/orders/{user_id}", response_model=List[OrderResponse])
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return orders

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order_details(
    order_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get order
        order = db.query(Order).filter(
            Order.order_id == order_id,
            Order.user_id == current_user.user_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Get order items
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        
        # Get product details for each item
        items = []
        for item in order_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if product:
                items.append({
                    "order_item_id": item.order_item_id,
                    "order_id": item.order_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price_at_time": float(item.price_at_time),
                    "created_at": item.created_at,
                    "name": product.name,
                    "image_url": product.image_url
                })
        
        # Get reward points earned for this order
        reward_points_earned = 0
        reward_points_transaction = db.query(RewardPoints).filter(
            RewardPoints.transaction_id == order_id,
            RewardPoints.user_id == current_user.user_id
        ).first()
        
        if reward_points_transaction:
            reward_points_earned = reward_points_transaction.points
            
        # Get the automatic redemption transaction
        auto_redeem_log = db.query(Logs).filter(
            Logs.user_id == current_user.user_id,
            Logs.action == "auto_reward_redemption",
            Logs.description.like(f"Automatically redeemed {reward_points_earned} points%")
        ).first()
            
        return {
            "order_id": order.order_id,
            "user_id": order.user_id,
            "account_id": order.account_id,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": items,
            "reward_points_earned": reward_points_earned,
            "payment_method": order.payment_method,
            "wallet_amount": float(order.wallet_amount) if order.wallet_amount else 0.0,
            "reward_discount": float(order.reward_discount) if order.reward_discount else 0.0
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders", response_model=List[OrderResponse])
async def get_user_orders(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get all orders for the current user
        orders = db.query(Order).filter(Order.user_id == current_user.user_id).all()
        
        # Get order items for each order
        result = []
        for order in orders:
            order_items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
            
            # Get product details for each item
            items = []
            for item in order_items:
                product = db.query(Product).filter(Product.product_id == item.product_id).first()
                if product:
                    items.append({
                        "order_item_id": item.order_item_id,
                        "order_id": item.order_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "price_at_time": float(item.price_at_time),
                        "created_at": item.created_at,
                        "name": product.name,
                        "image_url": product.image_url
                    })
            
            # Get reward points earned for this order
            # First find the transaction associated with this order
            transaction = db.query(Transactions).filter(
                Transactions.account_id == order.account_id,
                Transactions.transaction_type == TransactionType.purchase,
                Transactions.created_at.between(
                    order.created_at - timedelta(seconds=10),
                    order.created_at + timedelta(seconds=10)
                )
            ).first()
            
            reward_points_earned = 0
            if transaction:
                # Then get reward points using the correct transaction ID
                reward = db.query(RewardPoints).filter(
                    RewardPoints.transaction_id == transaction.transaction_id,
                    RewardPoints.user_id == current_user.user_id,
                    RewardPoints.status == RewardStatus.earned
                ).first()
                
                reward_points_earned = reward.points if reward else 0
            
            result.append({
                "order_id": order.order_id,
                "user_id": order.user_id,
                "account_id": order.account_id,
                "status": order.status,
                "total_amount": float(order.total_amount),
                "created_at": order.created_at,
                "updated_at": order.updated_at,
                "items": items,
                "reward_points_earned": reward_points_earned,
                "payment_method": order.payment_method
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin Endpoints
@app.get("/admin/logs")
def get_logs(db: Session = Depends(get_db)):
    query = text("""
        SELECT l.log_id, l.user_id, u.full_name, l.action, l.description, l.created_at
        FROM logs l
        JOIN "user" u ON l.user_id = u.user_id
        ORDER BY l.created_at DESC
    """)
    result = db.execute(query).fetchall()
    
    logs = [
        {
            "log_id": row[0],
            "user_id": row[1],
            "user_name": row[2],
            "action": row[3],
            "description": row[4],
            "created_at": row[5]
        }
        for row in result
    ]
    
    return {"logs": logs}

@app.get("/admin/stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db)):
    # Get total users
    total_users = db.query(Users).count()
    
    # Get total orders
    total_orders = db.query(Order).count()
    
    # Get total revenue
    total_revenue = db.query(Order).filter(Order.status == OrderStatus.completed).with_entities(
        text("SUM(total_amount)")
    ).scalar() or 0
    
    # Get active merchants
    active_merchants = db.query(Users).filter(
        Users.role == UserRole.merchant,
        Users.status == UserStatus.active
    ).count()
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "active_merchants": active_merchants
    }

@app.get("/user/profile/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    # Get user details
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user accounts
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    
    return {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "accounts": accounts
    }

@app.get("/featured/products", response_model=List[ProductResponse])
def get_featured_products(db: Session = Depends(get_db)):
    try:
        # Get products with discount (where price < mrp)
        featured_products = db.query(Product).filter(
            Product.price < Product.mrp,
            Product.status == ProductStatus.active,
            Product.stock > 0
        ).order_by(Product.mrp - Product.price).limit(10).all()
        if featured_products:
            return featured_products
        else:
            # If no featured products found, return some sample products
            # This is temporary for frontend testing
            sample_products = [
                {
                    "product_id": 1,
                    "name": "Smartphone X",
                    "description": "Latest smartphone with amazing features",
                    "price": 799.99,
                    "mrp": 999.99,
                    "stock": 10,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active
                },
                {
                    "product_id": 2,
                    "name": "Wireless Earbuds",
                    "description": "High quality sound with noise cancellation",
                    "price": 129.99,
                    "mrp": 149.99,
                    "stock": 15,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active
                },
                {
                    "product_id": 3,
                    "name": "Smart Watch",
                    "description": "Track your fitness and stay connected",
                    "price": 249.99,
                    "mrp": 299.99,
                    "stock": 5,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active
                }
            ]
            return sample_products
    except Exception as e:
        print(f"Error fetching featured products: {e}")
        # Return sample products for frontend testing
        sample_products = [
            {
                "product_id": 1,
                "name": "Smartphone X",
                "description": "Latest smartphone with amazing features",
                "price": 799.99,
                "mrp": 999.99,
                "stock": 10,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active
            },
            {
                "product_id": 2,
                "name": "Wireless Earbuds",
                "description": "High quality sound with noise cancellation",
                "price": 129.99,
                "mrp": 149.99,
                "stock": 15,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active
            },
            {
                "product_id": 3,
                "name": "Smart Watch",
                "description": "Track your fitness and stay connected",
                "price": 249.99,
                "mrp": 299.99,
                "stock": 5,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active
            }
        ]
        return sample_products

@app.get("/products/category/{category}", response_model=List[ProductResponse])
async def get_products_by_category(category: str, db: Session = Depends(get_db)):
    try:
        products = db.query(Product).filter(
            Product.business_category == category,
            Product.status == ProductStatus.active
        ).all()
        return products
    except Exception as e:
        print(f"Error fetching products by category: {e}")
        raise HTTPException(status_code=500, detail="Error fetching products")

@app.get("/products/categories", response_model=List[str])
async def get_categories(db: Session = Depends(get_db)):
    try:
        categories = db.query(Product.business_category).distinct().all()
        return [category[0] for category in categories if category[0]]
    except Exception as e:
        print(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Error fetching categories")

@app.get("/api/account/profile", response_model=UserProfileResponse)
async def get_profile(current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get user accounts
    accounts = db.query(Account).filter(Account.user_id == current_user.user_id).all()
    
    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "accounts": accounts
    }

@app.put("/api/account/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_update: UserUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, value in profile_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    
    # Get user accounts
    accounts = db.query(Account).filter(Account.user_id == current_user.user_id).all()
    
    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "accounts": accounts
    }

@app.put("/api/account/password")
async def change_password(
    password_update: PasswordUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(password_update.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.password_hash = get_password_hash(password_update.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/api/admin/stats")
async def get_admin_stats(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access statistics"
        )
    
    # Get total users
    total_users = db.query(Users).count()
    
    # Get total orders
    total_orders = db.query(Order).count()
    
    # Get total revenue
    total_revenue = db.query(Order).filter(Order.status == OrderStatus.completed).with_entities(
        text("SUM(total_amount)")
    ).scalar() or 0
    
    # Get active merchants
    active_merchants = db.query(Users).filter(
        Users.role == UserRole.merchant,
        Users.status == UserStatus.active
    ).count()
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "active_merchants": active_merchants
    }

@app.get("/api/admin/logs")
async def get_admin_logs(
    start_date: datetime = None,
    end_date: datetime = None,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access logs"
        )
    
    query = db.query(Logs)
    
    if start_date:
        query = query.filter(Logs.created_at >= start_date)
    if end_date:
        query = query.filter(Logs.created_at <= end_date)
    
    logs = query.order_by(Logs.created_at.desc()).all()
    return logs

@app.get("/api/merchant/products", response_model=List[ProductResponse])
async def get_merchant_products(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.merchant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can access their products"
        )
    
    products = db.query(Product).filter(Product.merchant_id == current_user.user_id).all()
    return products

@app.post("/api/merchant/products/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user)
):
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save the file
        image_url = await save_uploaded_file(file)
        
        return {"image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/merchant/products", response_model=ProductResponse)
async def create_merchant_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    mrp: float = Form(...),
    stock: int = Form(...),
    business_category: str = Form(...),
    image: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant
        merchant = db.query(Merchants).filter(
            Merchants.user_id == current_user.user_id,
            Merchants.business_category == business_category
        ).first()
        
        if not merchant:
            # Create a new merchant entry for this business category
            current_time = datetime.utcnow()
            merchant = Merchants(
                user_id=current_user.user_id,
                merchant_id=current_user.user_id,  # Using user_id as merchant_id
                business_name=current_user.full_name,
                business_category=business_category,
                name=current_user.full_name,
                email=current_user.email,
                contact=current_user.contact or "",  # Use contact from Users table
                created_at=current_time,
                updated_at=current_time
            )
            db.add(merchant)
            db.flush()  # Get the merchant_id without committing

        # Reset the products sequence
        try:
            db.execute(text("SELECT setval('products_product_id_seq', (SELECT COALESCE(MAX(product_id), 0) FROM products))"))
        except Exception as e:
            print(f"Error resetting sequence: {e}")

        # Save the image
        image_url = await save_uploaded_file(image)

        # Create product with current timestamp
        current_time = datetime.utcnow()
        product = Product(
            merchant_id=merchant.merchant_id,
            name=name,
            description=description,
            price=price,
            mrp=mrp,
            stock=stock,
            business_category=business_category,
            image_url=image_url,
            status=ProductStatus.active,
            created_at=current_time,
            updated_at=current_time
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        return product
    except Exception as e:
        # If there was an error, try to delete the uploaded file if it exists
        if 'image_url' in locals():
            delete_file(image_url)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/merchant/products/{product_id}", response_model=ProductResponse)
async def update_merchant_product(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    mrp: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    business_category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant
        merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Get product
        product = db.query(Product).filter(
            Product.product_id == product_id,
            Product.merchant_id == merchant.merchant_id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Update fields if provided
        if name is not None:
            product.name = name
        if description is not None:
            product.description = description
        if price is not None:
            product.price = price
        if mrp is not None:
            product.mrp = mrp
        if stock is not None:
            product.stock = stock
        if business_category is not None:
            product.business_category = business_category

        # Handle image update
        if image is not None:
            # Delete old image if exists
            if product.image_url:
                delete_file(product.image_url)
            
            # Save new image
            product.image_url = await save_uploaded_file(image)

        # Update timestamp
        product.updated_at = datetime.utcnow()
        
        # Keep the original created_at timestamp
        if not product.created_at:
            product.created_at = datetime.utcnow()

        db.commit()
        db.refresh(product)

        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/merchant/products/{product_id}")
async def delete_merchant_product(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "merchant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can delete products"
        )
    
    db_product = db.query(Product).filter(
        Product.product_id == product_id,
        Product.merchant_id == current_user.user_id
    ).first()
    
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}

# Product Management Endpoints
@app.post("/merchant/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    mrp: float = Form(...),
    stock: int = Form(...),
    image: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant record
        merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Save the image
        image_url = await save_uploaded_file(image, "products")

        # Create product
        product = Product(
            merchant_id=merchant.merchant_id,
            name=name,
            description=description,
            price=price,
            mrp=mrp,
            stock=stock,
            image_url=image_url,
            status=ProductStatus.active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/merchant/products", response_model=List[ProductResponse])
async def get_merchant_products(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    
    products = db.query(Product).filter(Product.merchant_id == merchant.merchant_id).all()
    return products

@app.put("/merchant/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    mrp: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    # Get merchant record
    merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    # Get product
    product = db.query(Product).filter(
        Product.product_id == product_id,
        Product.merchant_id == merchant.merchant_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update fields if provided
    if name is not None:
        product.name = name
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if mrp is not None:
        product.mrp = mrp
    if stock is not None:
        product.stock = stock
    if image is not None:
        # Delete old image if exists
        if product.image_url:
            await delete_file(product.image_url)
        # Save new image
        product.image_url = await save_uploaded_file(image, "products")

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product

@app.delete("/merchant/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    # Get merchant record
    merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    # Get product
    product = db.query(Product).filter(
        Product.product_id == product_id,
        Product.merchant_id == merchant.merchant_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete product image if exists
    if product.image_url:
        await delete_file(product.image_url)

    # Delete product
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

# Public product endpoints
@app.get("/products", response_model=List[ProductResponse])
async def get_products(db: Session = Depends(get_db)):
    try:
        products = db.query(Product).filter(Product.status == ProductStatus.active).all()
        return products
    except Exception as e:
        print(f"Error fetching products: {e}")
        raise HTTPException(status_code=500, detail="Error fetching products")

@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(
        Product.product_id == product_id,
        Product.status == ProductStatus.active
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product

# Merchant Signup and Login
@app.post("/merchant/signup", response_model=Token)
async def merchant_signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(Users).filter(Users.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_password = get_password_hash(user.password)
    
    try:
        # Create new user
        db_user = Users(
            email=user.email,
            full_name=user.full_name,
            password_hash=hashed_password,
            role=UserRole.merchant,
            status=UserStatus.active,
            phone=user.contact,  # Store contact as phone
            created_at=datetime.utcnow()
        )
        db.add(db_user)
        db.flush()  # Flush to get the user_id
        
        # Create merchant profile with required fields
        merchant = Merchants(
            user_id=db_user.user_id,
            merchant_id=db_user.user_id,  # Use user_id as merchant_id
            business_name=user.full_name,  # Use full_name as business_name
            business_category="General",  # Default category
            name=user.full_name,
            email=user.email,
            contact=user.contact or "",  # Use contact from user input
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(merchant)
        db.commit()
        db.refresh(db_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating merchant: {str(e)}"
        )

@app.post("/merchant/login", response_model=Token)
def merchant_login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        users = db.query(Users).filter(Users.email == user_data.email).first()
        if not users or users.role != UserRole.merchant:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        if not verify_password(user_data.password, users.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        access_token = create_access_token(data={"sub": users.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Error during merchant login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

# Merchant Product Management
@app.get("/api/merchant/{merchant_id}/logs")
async def get_merchant_logs(
    merchant_id: int,
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    if current_user.user_id != merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only access your own logs"
        )
    
    # Get all products for this merchant
    products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
    product_ids = [p.product_id for p in products]
    
    # Query logs for these products
    logs = []
    for product in products:
        # Get creation log
        logs.append({
            "product_name": product.name,
            "action": "Product Created",
            "business_category": product.business_category,
            "price": product.price,
            "stock": product.stock,
            "description": product.description,
            "timestamp": product.created_at
        })
        
        # Get update logs if the product was updated
        if product.updated_at > product.created_at:
            logs.append({
                "product_name": product.name,
                "action": "Product Updated",
                "business_category": product.business_category,
                "price": product.price,
                "stock": product.stock,
                "description": product.description,
                "timestamp": product.updated_at
            })
    
    # Sort logs by timestamp (newest first)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return logs

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product_details(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

@app.get("/api/merchant/profile", response_model=dict)
async def get_merchant_profile(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant profile
        merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")
        
        return {
            "merchant_id": merchant.merchant_id,
            "business_name": merchant.business_name,
            "business_category": merchant.business_category,
            "name": merchant.name,
            "email": merchant.email,
            "contact": merchant.contact,
            "created_at": merchant.created_at,
            "updated_at": merchant.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/merchant/stats", response_model=dict)
async def get_merchant_stats(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant profile
        merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")
        
        # Get total products count
        total_products = db.query(func.count(Product.product_id)).filter(
            Product.merchant_id == merchant.merchant_id
        ).scalar() or 0
        
        # Get active listings (products with status = active)
        active_listings = db.query(func.count(Product.product_id)).filter(
            Product.merchant_id == merchant.merchant_id,
            Product.status == ProductStatus.active
        ).scalar() or 0
        
        return {
            "total_products": total_products,
            "active_listings": active_listings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/merchant/profile", response_model=dict)
async def update_merchant_profile(
    business_name: Optional[str] = Form(None),
    business_category: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db)
):
    try:
        # Get merchant profile
        merchant = db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")
        
        # Update fields if provided
        if business_name is not None:
            merchant.business_name = business_name
        if business_category is not None:
            merchant.business_category = business_category
        if contact is not None:
            merchant.contact = contact
        
        # Update timestamp
        merchant.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(merchant)
        
        return {
            "merchant_id": merchant.merchant_id,
            "business_name": merchant.business_name,
            "business_category": merchant.business_category,
            "name": merchant.name,
            "email": merchant.email,
            "contact": merchant.contact,
            "created_at": merchant.created_at,
            "updated_at": merchant.updated_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/me", response_model=dict)
async def get_current_user_info(current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        
        return {
            "user_id": current_user.user_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "status": current_user.status,
            "account": {
                "id": account.account_id if account else None,
                "balance": float(account.balance) if account else 0.0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/balance", response_model=dict)
async def get_user_balance(current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {
            "balance": float(account.balance)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/checkout", response_model=OrderResponse)
async def process_checkout(
    payment_method: str = Body(None),
    use_wallet: bool = Body(False),
    use_rewards: bool = Body(False),
    reward_points: Optional[int] = Body(None),
    order_date: Optional[str] = Body(None),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Get cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")
        
        # Calculate total and check stock
        total = 0.0
        order_items = []
        
        for item in cart_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            if product.stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"Not enough stock for product {product.name}")
            # Convert Decimal to float for calculations
            item_price = float(product.price)
            item_total = item_price * item.quantity
            total += item_total
            order_items.append((product, item.quantity))
        
        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Calculate reward discount if using rewards
        reward_discount = 0.0
        if use_rewards and reward_points:
            # Get user's available reward points
            available_rewards = db.query(RewardPoints).filter(
                RewardPoints.user_id == current_user.user_id,
                RewardPoints.status == RewardStatus.earned
            ).all()
            
            total_points = sum(reward.points for reward in available_rewards)
            if reward_points > total_points:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient reward points. Available: {total_points}"
                )
            
            # Calculate reward value (1 point = ₹0.1)
            reward_discount = float(reward_points) * 0.1
        
        # Calculate wallet amount to use
        wallet_amount = 0.0
        if use_wallet:
            if account.balance > 0:
                # Convert Decimal to float for calculations
                account_balance = float(account.balance)
                wallet_amount = min(total, account_balance)
            else:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Calculate final amount after discounts
        final_amount = total - reward_discount - wallet_amount
        
        if final_amount < 0:
            final_amount = 0
        
        # Check if account balance is sufficient if using wallet only
        if payment_method == 'wallet' and final_amount > 0:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance. Please select another payment method.")
        
        # Create order
        created_at = datetime.utcnow()
        if order_date:
            try:
                created_at = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                # If there's any error parsing the date, use current time
                pass
            
        db_order = Order(
            user_id=current_user.user_id,
            account_id=account.account_id,
            total_amount=total,
            payment_method=payment_method,
            wallet_amount=wallet_amount,
            reward_discount=reward_discount,
            status=OrderStatus.pending,
            created_at=created_at,
            updated_at=created_at
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        
        # Create order items and update stock
        for product, quantity in order_items:
            order_item = OrderItem(
                order_id=db_order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                price_at_time=float(product.price),
                created_at=created_at
            )
            db.add(order_item)
            product.stock -= quantity
            product.updated_at = created_at
        
        # Update account balance if using wallet
        if wallet_amount > 0:
            account.balance -= wallet_amount
        
        # Process reward points redemption if used
        if use_rewards and reward_points:
            points_to_redeem = reward_points
            for reward in available_rewards:
                if points_to_redeem <= 0:
                    break
                
                if reward.points <= points_to_redeem:
                    reward.status = RewardStatus.redeemed
                    points_to_redeem -= reward.points
                else:
                    # Split the reward point record
                    remaining_points = reward.points - points_to_redeem
                    reward.points = points_to_redeem
                    reward.status = RewardStatus.redeemed
                    
                    new_reward = RewardPoints(
                        transaction_id=db_order.order_id,
                        user_id=reward.user_id,
                        points=remaining_points,
                        status=RewardStatus.earned,
                        created_at=created_at
                    )
                    db.add(new_reward)
                    points_to_redeem = 0
        
        # Create transaction for the purchase
        transaction = Transactions(
            account_id=account.account_id,
            amount=total,
            transaction_type=TransactionType.purchase,
            status=TransactionStatus.completed,
            created_at=created_at
        )
        db.add(transaction)
        db.flush()  # Flush to get the transaction ID
        
        # Add reward points (5% of total amount) AFTER transaction creation
        earned_points = 0
        if payment_method != 'cod':
            earned_points = int(total * 0.05)  # 5% of order total
            if earned_points > 0:
                reward = RewardPoints(
                    transaction_id=transaction.transaction_id,  # Use transaction ID instead of order ID
                    user_id=current_user.user_id,
                    points=earned_points,
                    status=RewardStatus.earned,
                    created_at=created_at
                )
                db.add(reward)
                
                # Automatically convert reward points to wallet balance
                await convert_reward_points_to_wallet(current_user.user_id, earned_points, db)
        
        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()
        
        # Log order
        log = Logs(
            user_id=current_user.user_id,
            action="order_creation",
            description=f"Order {db_order.order_id} created. Total: ₹{total}, Wallet: ₹{wallet_amount}, Rewards: ₹{reward_discount}",
            created_at=created_at
        )
        db.add(log)
        
        db.commit()
        
        # Get order items with product details
        items = []
        for item in order_items:
            product = item[0]
            quantity = item[1]
            items.append({
                "order_item_id": 0,  # Will be set by the database
                "order_id": db_order.order_id,
                "product_id": product.product_id,
                "quantity": quantity,
                "price_at_time": float(product.price),
                "created_at": created_at,
                "name": product.name,
                "image_url": product.image_url
            })
        
        return {
            "order_id": db_order.order_id,
            "user_id": current_user.user_id,
            "account_id": account.account_id,
            "status": db_order.status,
            "total_amount": float(total),
            "payment_method": payment_method,
            "wallet_amount": float(wallet_amount),
            "reward_discount": float(reward_discount),
            "created_at": created_at,
            "updated_at": created_at,
            "items": items,
            "reward_points_earned": earned_points
        }
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/account/add-funds", response_model=dict)
async def add_funds(
    amount: float = Body(...),
    payment_method: str = Body(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Create transaction
        transaction = Transactions(
            account_id=account.account_id,
            amount=amount,
            transaction_type=TransactionType.top_up,
            status=TransactionStatus.completed,
            created_at=datetime.utcnow()
        )
        db.add(transaction)

        # Update account balance
        account.balance += amount

        # Log transaction
        log = Logs(
            user_id=current_user.user_id,
            action="wallet_top_up",
            description=f"Added ₹{amount} to wallet via {payment_method}",
            created_at=datetime.utcnow()
        )
        db.add(log)

        db.commit()
        db.refresh(account)

        return {
            "message": "Funds added successfully",
            "new_balance": float(account.balance)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/account/rewards", response_model=dict)
async def get_rewards(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's reward points
        rewards = db.query(RewardPoints).filter(
            RewardPoints.user_id == current_user.user_id,
            RewardPoints.status == RewardStatus.earned
        ).all()

        total_points = sum(reward.points for reward in rewards)
        
        return {
            "total_points": total_points,
            "points_value": float(total_points * 0.1),  # 1 point = ₹0.1
            "rewards": [
                {
                    "reward_id": reward.reward_id,
                    "points": reward.points,
                    "created_at": reward.created_at
                }
                for reward in rewards
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/account/redeem-rewards/{points}", response_model=dict)
async def redeem_rewards_path(
    points: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get user's reward points
        available_rewards = db.query(RewardPoints).filter(
            RewardPoints.user_id == current_user.user_id,
            RewardPoints.status == RewardStatus.earned
        ).all()

        total_points = sum(reward.points for reward in available_rewards)

        if points > total_points:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient reward points. Available: {total_points}"
            )

        # Calculate reward value (1 point = ₹0.1)
        # Convert to Decimal to match the account.balance type
        reward_value = Decimal(str(points * 0.1))

        # Get user's account
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Update account balance
        account.balance += reward_value

        # Update reward points status
        points_to_redeem = points
        for reward in available_rewards:
            if points_to_redeem <= 0:
                break
            
            if reward.points <= points_to_redeem:
                reward.status = RewardStatus.redeemed
                points_to_redeem -= reward.points
            else:
                # Split the reward point record
                remaining_points = reward.points - points_to_redeem
                reward.points = points_to_redeem
                reward.status = RewardStatus.redeemed
                
                new_reward = RewardPoints(
                    transaction_id=reward.transaction_id,
                    user_id=reward.user_id,
                    points=remaining_points,
                    status=RewardStatus.earned,
                    created_at=datetime.utcnow()
                )
                db.add(new_reward)
                points_to_redeem = 0

        # Create transaction for reward redemption
        transaction = Transactions(
            account_id=account.account_id,
            amount=float(reward_value),  # Convert Decimal to float for storage
            transaction_type=TransactionType.reward_redemption,
            status=TransactionStatus.completed,
            created_at=datetime.utcnow()
        )
        db.add(transaction)

        # Log transaction
        log = Logs(
            user_id=current_user.user_id,
            action="reward_redemption",
            description=f"Redeemed {points} points for ₹{float(reward_value)}",
            created_at=datetime.utcnow()
        )
        db.add(log)

        db.commit()

        return {
            "message": f"Successfully redeemed {points} points for ₹{float(reward_value)}",
            "new_balance": float(account.balance),
            "remaining_points": total_points - points
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Add this after the create_order function or in a suitable location
async def convert_reward_points_to_wallet(user_id: int, earned_points: int, db: Session) -> float:
    """
    Automatically converts reward points to wallet balance
    Returns the amount added to the wallet
    """
    if earned_points <= 0:
        return 0.0
        
    # Calculate reward value (1 point = ₹0.1)
    # Convert to Decimal to match the account.balance type
    reward_value = Decimal(str(earned_points * 0.1))
    
    # Get user's account
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        return 0.0
    
    # Update account balance
    account.balance += reward_value
    
    # Update reward status to redeemed
    reward = db.query(RewardPoints).filter(
        RewardPoints.user_id == user_id,
        RewardPoints.points == earned_points,
        RewardPoints.status == RewardStatus.earned
    ).order_by(RewardPoints.created_at.desc()).first()
    
    if reward:
        reward.status = RewardStatus.redeemed
    
    # Log transaction
    log = Logs(
        user_id=user_id,
        action="reward_conversion",
        description=f"Converted {earned_points} reward points to ₹{float(reward_value)} in wallet",
        created_at=datetime.utcnow()
    )
    db.add(log)
    
    return float(reward_value)

