from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from sqlalchemy.sql import text
from datetime import datetime, timedelta
from typing import Optional, List


from database import engine, Base, get_db
from models import Users, UserRole, UserStatus, Product, Cart, CartItem, Order, OrderItem, ProductStatus, OrderStatus, Account, AccountType, Transactions, TransactionType, TransactionStatus, Logs, Merchants
from auth import get_password_hash, verify_password, create_access_token, get_current_user, get_current_active_user, get_current_admin_user, get_current_merchant_user
from file_upload import save_uploaded_file, delete_file
from schemas import *

import shutil
import os

from passlib.context import CryptContext
from dotenv import load_dotenv
from sqlalchemy import func
import schemas


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
            created_at=datetime.now()
        )
        
        db.add(db_user)
        db.flush()  # Get the user_id without committing
        
        # Create account for new user with zero balance
        account = Account(
            user_id=db_user.user_id,
            account_type=AccountType.user,
            balance=0.0,
            created_at=datetime.now()
        )
        db.add(account)
        
        # Log user creation
        log = Logs(
            user_id=db_user.user_id,
            action="user_creation",
            description=f"User {user.email} created with role {user.role}",
            created_at=datetime.now()
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
            created_at=datetime.now()
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
        created_at=datetime.now()
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    # Log account creation
    log = Logs(
        user_id=user_id,
        action="account_creation",
        description=f"Account {db_account.account_id} created for user {user.email}",
        created_at=datetime.now()
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
        created_at=datetime.now()
    )
    
    db.add(transaction)
    
    # Update account balance
    account.balance += amount
    
    # Log transaction
    log = Logs(
        user_id=account.user_id,
        action="account_top_up",
        description=f"Account {account_id} topped up with {amount}",
        created_at=datetime.now()
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
            created_at=datetime.now()
        )
        
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        
        # Log transaction
        log = Logs(
            user_id=account.user_id,
            action="transaction_creation",
            description=f"Transaction {db_transaction.transaction_id} created for account {transaction.account_id}",
            created_at=datetime.now()
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
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(
        name=product.name,
        description=product.description,
        price=product.price,
        mrp=product.mrp,
        stock=product.stock,
        image_url=product.image_url,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products/", response_model=List[ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(Product).offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
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
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.id}.{file_extension}"
    file_path = os.path.join("uploads", filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL for the uploaded image
    return {"url": f"/uploads/{filename}"}

# Cart Endpoints
@app.post("/cart/add", response_model=CartResponse)
def add_to_cart(item: CartItemCreate, user_id: int, db: Session = Depends(get_db)):
    # Get or create cart
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id, created_at=datetime.now(), updated_at=datetime.now())
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
        cart_item.updated_at = datetime.now()
    else:
        cart_item = CartItem(
            cart_id=cart.cart_id,
            product_id=item.product_id,
            quantity=item.quantity,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(cart_item)
    
    db.commit()
    
    # Calculate total
    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    total = 0
    for item in cart_items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if product:
            total += item.quantity * product.price
    
    # Log cart update
    log = Logs(
        user_id=user_id,
        action="cart_update",
        description=f"User {user_id} added product {item.product_id} to cart",
        created_at=datetime.now()
    )
    db.add(log)
    db.commit()
    
    return {
        "cart_id": cart.cart_id,
        "items": [{"product_id": item.product_id, "quantity": item.quantity} for item in cart_items],
        "total_amount": total
    }

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

# Order Endpoints
@app.post("/orders/", response_model=OrderResponse)
def create_order(order: OrderCreate, user_id: int, db: Session = Depends(get_db)):
    # Get cart
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total and check stock
    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    total = 0
    order_items = []
    
    for item in cart_items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for product {product.name}")
        total += item.quantity * product.price
        order_items.append((product, item.quantity))
    
    # Check account balance
    account = db.query(Account).filter(Account.account_id == order.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.balance < total:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create order
    db_order = Order(
        user_id=user_id,
        account_id=order.account_id,
        total_amount=total,
        status=OrderStatus.pending,
        created_at=datetime.now(),
        updated_at=datetime.now()
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
            price_at_time=product.price,
            created_at=datetime.now()
        )
        db.add(order_item)
        product.stock -= quantity
        product.updated_at = datetime.now()
    
    # Update account balance
    account.balance -= total
    
    # Create transaction
    transaction = Transactions(
        account_id=order.account_id,
        amount=total,
        transaction_type=TransactionType.purchase,
        status=TransactionStatus.completed,
        created_at=datetime.now()
    )
    db.add(transaction)
    
    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()
    
    # Log order
    log = Logs(
        user_id=user_id,
        action="order_creation",
        description=f"Order {db_order.order_id} created for user {user_id} with total amount {total}",
        created_at=datetime.now()
    )
    db.add(log)
    
    db.commit()
    
    return {
        "order_id": db_order.order_id,
        "total_amount": total,
        "status": db_order.status,
        "items": [{"product_id": item[0].product_id, "quantity": item[1]} for item in order_items]
    }

@app.get("/orders/{user_id}", response_model=List[OrderResponse])
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return orders

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
    
    # Get total orders and revenue
    total_orders = db.query(Order).count()
    total_revenue = db.query(Order).filter(Order.status == "completed").with_entities(
        func.sum(Order.total_amount)
    ).scalar() or 0
    
    # Get active merchants
    active_merchants = db.query(Users).filter(
        Users.role == "merchant",
        Users.status == UserStatus.active
    ).count()
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
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
            merchant = Merchants(
                user_id=current_user.user_id,
                merchant_id=current_user.user_id,  # Using user_id as merchant_id
                business_name=current_user.full_name,
                business_category=business_category,
                name=current_user.full_name,
                email=current_user.email,
                contact=current_user.phone or "",  # Use phone from Users table
                created_at=datetime.now(),
                updated_at=datetime.now()
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

        # Create product
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
            created_at=datetime.now(),
            updated_at=datetime.now()
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

        # Handle image update
        if image is not None:
            # Delete old image if exists
            if product.image_url:
                delete_file(product.image_url)
            
            # Save new image
            product.image_url = await save_uploaded_file(image)

        product.updated_at = datetime.utcnow()
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
    if name:
        product.name = name
    if description:
        product.description = description
    if price:
        product.price = price
    if mrp:
        product.mrp = mrp
    if stock:
        product.stock = stock
    if image:
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
        raise HTTPException(status_code=404, detail="Product not found")
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
            created_at=datetime.now()
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
            created_at=datetime.now(),
            updated_at=datetime.now()
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
