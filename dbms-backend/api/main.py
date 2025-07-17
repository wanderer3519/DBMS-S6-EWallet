import logging
import os
from datetime import datetime
from decimal import Decimal

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from api.auth import (
    get_current_user,
)
from api.database import Base, engine, get_db
from api.models import (
    Account,
    Logs,
    Product,
    RewardPoints,
    RewardStatus,
    Users,
)
from api.routers import all_routers
from api.schemas import ProductResponse
from config.logging_config import setup_logging

# Load environment variables
load_dotenv()

setup_logging()

logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

for router in all_routers:
    app.include_router(router)

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
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# API Endpoints
@app.get("/")
def home():
    return {"message": "Hello! This is Chakradhar Reddy"}


@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product_details(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.product_id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    return product


# Add this after the create_order function or in a suitable location
async def convert_reward_points_to_wallet(
    user_id: int, earned_points: int, db: Session
) -> float:
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
    reward = (
        db.query(RewardPoints)
        .filter(
            RewardPoints.user_id == user_id,
            RewardPoints.points == earned_points,
            RewardPoints.status == RewardStatus.earned,
        )
        .order_by(RewardPoints.created_at.desc())
        .first()
    )

    if reward:
        reward.status = RewardStatus.redeemed

    # Log transaction
    log = Logs(
        user_id=user_id,
        action="reward_conversion",
        description=f"Converted {earned_points} reward points to ₹{float(reward_value)} in wallet",
        created_at=datetime.now(),
    )
    db.add(log)

    return float(reward_value)

