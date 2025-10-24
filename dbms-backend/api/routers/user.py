from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
from pathlib import Path

from api.auth_lib import get_current_user, get_password_hash, verify_password
from api.database import get_db
from api.models import Account, Users
from api.schemas import PasswordUpdate, UserProfileResponse

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/profile/{user_id}", response_model=UserProfileResponse)
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
        "accounts": accounts,
    }


@router.get("/profile", response_model=dict)
def get_current_user_info(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        # Get user's account
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )

        return {
            "user_id": current_user.user_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "status": current_user.status,
            "account": {
                "id": account.account_id if account else None,
                "balance": float(account.balance) if account else 0.0,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/balance", response_model=dict)
def get_user_balance(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get user's account
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        return {"balance": float(account.balance)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/password")
def change_password(
    password_update: PasswordUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(
        password_update.current_password, current_user.password_hash
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    current_user.password_hash = get_password_hash(password_update.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or update user profile picture"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Move to end of file
    file_size = file.file.tell()  # Get current position (file size)
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 5 * 1024 * 1024:  # 5MB in bytes
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads/profiles")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        filename = f"user_{current_user.user_id}.{file_extension}"
        file_path = upload_dir / filename
        
        # Delete old profile picture if exists
        if current_user.profile_image:
            old_path = Path(current_user.profile_image)
            if old_path.exists():
                old_path.unlink()
        
        # Save new file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update database
        current_user.profile_image = str(file_path)
        db.commit()
        db.refresh(current_user)
        
        return {
            "message": "Avatar uploaded successfully",
            "profile_image": str(file_path),
            "url": f"/uploads/profiles/{filename}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")


@router.get("/dashboard", response_model=dict)
def get_dashboard_data(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Fetches all necessary data for the user dashboard.
    """
    try:
        # 1. Get User Info and Account Balance
        account = db.query(Account).filter(Account.user_id == current_user.user_id).first()
        balance = float(account.balance) if account else 0.0

        user_info = {
            "user_id": current_user.user_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "status": current_user.status,
            "created_at": current_user.created_at,
            "accounts": [account] if account else [],
        }

        # 2. Get Recent Transactions (placeholder logic)
        # In a real app, you would query the Transactions table
        recent_transactions = [
            {'id': 1, 'type': 'purchase', 'description': 'Laptop', 'amount': -899.99, 'date': datetime(2023, 10, 24)},
            {'id': 2, 'type': 'deposit', 'description': 'Bank Transfer', 'amount': 1500.00, 'date': datetime(2023, 10, 22)},
            {'id': 3, 'type': 'purchase', 'description': 'Smartphone', 'amount': -450.25, 'date': datetime(2023, 10, 21)},
        ]

        # 3. Get Rewards Points (placeholder logic)
        rewards_points = 1250  # Replace with actual query

        return {
            "userInfo": user_info,
            "accountBalance": balance,
            "recentTransactions": recent_transactions,
            "rewardsPoints": rewards_points,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
