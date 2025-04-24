"""
main_sql.py - Modified version of main.py that uses SQL implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os
import shutil
import uuid
import jwt
from dotenv import load_dotenv
import logging
from decimal import Decimal

# Import the SQL adapter instead of SQLAlchemy ORM
import sql_adapter as db
from auth import create_access_token, get_current_user, get_current_active_user, get_current_admin_user, get_current_merchant_user
from file_upload import save_uploaded_file, delete_file, save_profile_image
from schemas import *

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

# Mount static files directory for uploads
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# API Routes
@app.get('/')
def home():
    return {"message": "Welcome to eWallet Merchant API"}

# User Authentication
@app.post("/signup", response_model=Token)
def signup(user: UserCreate):
    try:
        # Create new user
        user_data = db.create_user(
            full_name=user.full_name,
            email=user.email,
            password=user.password,
            role=user.role,
            phone=user.contact
        )
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User creation failed"
            )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_data.get("user_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/login", response_model=Token)
def login(user_data: UserLogin):
    try:
        # Authenticate user
        user = db.authenticate_user(
            email=user_data.email,
            password=user_data.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.email},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.get("user_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# Account Management
@app.post("/accounts/", response_model=AccountResponse)
def create_account(account: AccountCreate, user_id: int):
    try:
        account_data = db.create_account(
            user_id=user_id,
            account_type=account.account_type
        )
        
        if not account_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account creation failed"
            )
        
        return account_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/accounts/{user_id}", response_model=List[AccountResponse])
def get_user_accounts(user_id: int):
    return db.get_user_accounts(user_id)

@app.post("/accounts/{account_id}/top-up", response_model=TransactionResponse)
def top_up_account(account_id: int, amount: float):
    try:
        transaction = db.top_up_account(
            account_id=account_id,
            amount=amount
        )
        
        return transaction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/transactions/", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate):
    try:
        if transaction.transaction_type == "top-up":
            transaction_data = db.top_up_account(
                account_id=transaction.account_id,
                amount=transaction.amount
            )
        elif transaction.transaction_type == "withdrawal":
            transaction_data = db.withdraw_funds(
                account_id=transaction.account_id,
                amount=transaction.amount
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid transaction type"
            )
        
        return transaction_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/transactions/{account_id}", response_model=List[TransactionResponse])
def fetch_transactions(account_id: int):
    return db.get_account_transactions(account_id)

@app.get("/reward-points/{user_id}")
def get_reward_points(user_id: int):
    try:
        points = db.get_user_reward_points(user_id)
        return {"available_points": points.get("get_user_reward_points", 0)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/redeem-rewards/")
def redeem_rewards(user_id: int, points: int):
    try:
        result = db.redeem_reward_points(user_id, points)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/process-withdrawal/")
def process_withdrawal(account_id: int, amount: float):
    try:
        transaction = db.withdraw_funds(account_id, amount)
        return transaction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Product Management
@app.post("/products/", response_model=ProductResponse)
async def create_product(product: ProductCreate, merchant_id: int):
    try:
        product_data = db.create_product(
            merchant_id=merchant_id,
            name=product.name,
            description=product.description,
            price=float(product.price),
            mrp=float(product.mrp),
            stock=product.stock,
            business_category=product.business_category,
            image_url=product.image_url
        )
        
        return product_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/products/", response_model=List[ProductResponse])
def get_products(skip: int = 0, limit: int = 100):
    return db.get_all_products(limit, skip)

@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    product = db.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product

@app.get("/products/merchant/{merchant_id}", response_model=List[ProductResponse])
def get_merchant_products(merchant_id: int):
    return db.get_merchant_products(merchant_id)

@app.post("/products/upload-image/")
async def upload_product_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        file_location = f"uploads/products/{uuid.uuid4().hex}_{file.filename}"
        
        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())
        
        # Return the file path that can be used in the product creation/update
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_path": file_location
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not upload file: {str(e)}"
        )

# Cart Management
@app.post("/api/cart/add", response_model=Dict[str, Any])
async def add_to_cart(item: CartItemCreate, current_user: dict = Depends(get_current_user)):
    try:
        cart = db.add_to_cart(
            user_id=current_user["user_id"],
            product_id=item.product_id,
            quantity=item.quantity
        )
        
        return cart
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/cart/{user_id}", response_model=Dict[str, Any])
def get_cart(user_id: int):
    try:
        cart = db.get_user_cart(user_id)
        return cart
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/cart/{product_id}")
async def remove_from_cart(product_id: int, current_user: dict = Depends(get_current_user)):
    try:
        cart = db.remove_from_cart(
            user_id=current_user["user_id"],
            product_id=product_id
        )
        
        return cart
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/cart", response_model=Dict[str, Any])
async def get_current_user_cart(current_user: dict = Depends(get_current_user)):
    try:
        cart = db.get_user_cart(current_user["user_id"])
        return cart
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/cart/{product_id}", response_model=Dict[str, Any])
async def update_cart_item(
    product_id: int,
    quantity: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        cart = db.update_cart_item(
            user_id=current_user["user_id"],
            product_id=product_id,
            quantity=quantity
        )
        
        return cart
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Order Management
@app.post("/orders/", response_model=Dict[str, Any])
def create_order(
    order: OrderCreate,
    payment_method: str = Body(...),
    use_wallet: bool = Body(False),
    use_rewards: bool = Body(False),
    reward_points: Optional[int] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        order_data = db.create_order(
            user_id=current_user["user_id"],
            account_id=order.account_id,
            payment_method=payment_method,
            use_wallet=use_wallet,
            use_rewards=use_rewards,
            reward_points=reward_points or 0
        )
        
        return order_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/orders/{user_id}", response_model=List[Dict[str, Any]])
def get_user_orders(user_id: int):
    return db.get_user_orders(user_id)

@app.get("/api/orders/{order_id}", response_model=Dict[str, Any])
async def get_order_details(
    order_id: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        order = db.get_order_details(order_id)
        
        # Check if the order belongs to the current user
        if order["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
        
        return order
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/orders", response_model=List[Dict[str, Any]])
async def get_user_orders(current_user: dict = Depends(get_current_user)):
    try:
        orders = db.get_user_orders(current_user["user_id"])
        return orders
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Admin Operations
@app.get("/admin/logs")
def get_logs(token: str = Depends(oauth2_scheme)):
    try:
        # Verify admin role (this will be handled by the dependency)
        logs = db.get_admin_logs()
        return logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/admin/stats", response_model=AdminStats)
def get_admin_stats(token: str = Depends(oauth2_scheme)):
    try:
        # Verify admin role (this will be handled by the dependency)
        stats = db.get_admin_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/admin/stats", response_model=AdminStats)
async def get_api_admin_stats(
    token: str = Depends(oauth2_scheme)
):
    try:
        # Verify admin role (this will be handled by the dependency)
        stats = db.get_admin_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/admin/signup", response_model=Token)
async def admin_signup(user: UserCreate):
    try:
        # Create admin user
        user_data = db.create_user(
            full_name=user.full_name,
            email=user.email,
            password=user.password,
            role='admin',
            phone=user.contact
        )
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin creation failed"
            )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_data.get("user_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/admin/login", response_model=Token)
def admin_login(user_data: UserLogin):
    try:
        # Authenticate admin
        user = db.authenticate_user(
            email=user_data.email,
            password=user_data.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is admin
        if user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an admin",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.email},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.get("user_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/api/admin/orders")
async def get_admin_orders(token: str = Depends(oauth2_scheme)):
    try:
        # Verify admin role (this will be handled by the dependency)
        orders = db.get_admin_orders()
        return orders
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# User Profile
@app.get("/user/profile/{user_id}", response_model=Dict[str, Any])
def get_user_profile(user_id: int):
    try:
        profile = db.get_user_profile(user_id)
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Product Categories
@app.get("/featured/products", response_model=List[ProductResponse])
def get_featured_products():
    try:
        products = db.get_featured_products()
        return products
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/products/category/{category}", response_model=List[ProductResponse])
async def get_products_by_category(category: str):
    try:
        products = db.get_products_by_category(category)
        return products
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/products/categories", response_model=List[str])
async def get_categories():
    try:
        categories = db.get_product_categories()
        return categories
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# User Account
@app.get("/api/account/profile", response_model=Dict[str, Any])
async def get_profile(current_user: dict = Depends(get_current_user)):
    try:
        profile = db.get_user_profile(current_user["user_id"])
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/account/profile", response_model=Dict[str, Any])
async def update_profile(
    profile_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        updated_profile = db.update_user_profile(
            user_id=current_user["user_id"],
            full_name=profile_update.full_name,
            email=profile_update.email
        )
        
        return updated_profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/account/password")
async def change_password(
    password_update: PasswordUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        result = db.change_user_password(
            user_id=current_user["user_id"],
            current_password=password_update.current_password,
            new_password=password_update.new_password
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Merchant Products
@app.get("/api/merchant/products", response_model=List[ProductResponse])
async def get_merchant_products(current_user: dict = Depends(get_current_user)):
    try:
        # Get merchant info
        merchant = db.get_merchant_by_user(current_user["user_id"])
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant not found"
            )
        
        # Get merchant products
        products = db.get_merchant_products(merchant["merchant_id"])
        return products
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/api/merchant/products/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_merchant_user)
):
    try:
        file_location = f"uploads/products/{uuid.uuid4().hex}_{file.filename}"
        
        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())
        
        # Return the file path that can be used in the product creation/update
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_path": file_location
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not upload file: {str(e)}"
        )

@app.post("/api/merchant/products", response_model=ProductResponse)
async def create_merchant_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    mrp: float = Form(...),
    stock: int = Form(...),
    business_category: str = Form(...),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_merchant_user)
):
    try:
        # Get merchant info
        merchant = db.get_merchant_by_user(current_user["user_id"])
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant not found"
            )
        
        # Save product image
        image_url = await save_uploaded_file(image, "products")
        
        # Create product
        product = db.create_product(
            merchant_id=merchant["merchant_id"],
            name=name,
            description=description,
            price=price,
            mrp=mrp,
            stock=stock,
            business_category=business_category,
            image_url=image_url
        )
        
        return product
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Add remaining endpoint implementations...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_sql:app", host="0.0.0.0", port=8000, reload=True) 