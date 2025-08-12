from datetime import datetime
from decimal import Decimal
from sqlalchemy import func

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.auth_lib import get_current_user
from api.database import get_db
from api.file_upload import delete_file, save_profile_image
from api.models import Account, Logs, RewardPoints, RewardStatus, Transactions, Users
from api.schemas import (
    AccountCreate,
    AccountResponse,
    TransactionResponse,
    TransactionStatus,
    TransactionType,
    UserProfileResponse,
    UserUpdate,
)

router = APIRouter(prefix="/api/account", tags=["Account"])


# Account Management Endpoints
@router.post("", response_model=AccountResponse)
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
        created_at=datetime.now(),
    )

    db.add(db_account)
    db.commit()
    db.refresh(db_account)

    # Log account creation
    log = Logs(
        user_id=user_id,
        action="account_creation",
        description=f"Account {db_account.account_id} created for user {user.email}",
        created_at=datetime.now(),
    )
    db.add(log)
    db.commit()

    return db_account


@router.get("/user/{user_id}", response_model=list[AccountResponse])
def get_user_accounts(user_id: int, db: Session = Depends(get_db)):
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    return accounts


@router.post("/{account_id}/top-up", response_model=TransactionResponse)
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
        created_at=datetime.now(),
    )

    db.add(transaction)

    # Update account balance
    account.balance += amount

    # Log transaction
    log = Logs(
        user_id=account.user_id,
        action="account_top_up",
        description=f"Account {account_id} topped up with {amount}",
        created_at=datetime.now(),
    )
    db.add(log)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/user/profile", response_model=UserProfileResponse)
def get_profile(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Get user accounts
    accounts = db.query(Account).filter(Account.user_id == current_user.user_id).all()

    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "accounts": accounts,
    }


@router.put("/user/profile", response_model=UserProfileResponse)
def update_profile(
    profile_update: UserUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Update only provided fields
        for field, value in profile_update.dict(exclude_unset=True).items():
            setattr(current_user, field, value)

        db.commit()
        db.refresh(current_user)

        # Log the profile update
        log = Logs(
            user_id=current_user.user_id,
            action="profile_update",
            description=f"User {current_user.user_id} updated profile information",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        # Load related accounts
        accounts = db.query(Account).filter(
            Account.user_id == current_user.user_id
        ).all()

        # Return Pydantic model directly from ORM object
        return UserProfileResponse.from_orm(current_user).copy(
            update={"accounts": accounts}
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/add-funds", response_model=dict)
def add_funds(
    amount: float = Body(...),
    payment_method: str = Body(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get user's account
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Create transaction
        transaction = Transactions(
            account_id=account.account_id,
            amount=amount,
            transaction_type=TransactionType.top_up,
            status=TransactionStatus.completed,
            created_at=datetime.now(),
        )
        db.add(transaction)

        # Update account balance
        account.balance += amount

        # Log transaction
        log = Logs(
            user_id=current_user.user_id,
            action="wallet_top_up",
            description=f"Added ₹{amount} to wallet via {payment_method}",
            created_at=datetime.now(),
        )
        db.add(log)

        db.commit()
        db.refresh(account)

        return {
            "message": "Funds added successfully",
            "new_balance": float(account.balance),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/rewards", response_model=dict)
def get_rewards(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        # Get user's reward points
        rewards = (
            db.query(RewardPoints)
            .filter(
                RewardPoints.user_id == current_user.user_id,
                RewardPoints.status == RewardStatus.earned,
            )
            .all()
        )

        total_points = sum(reward.points for reward in rewards)

        return {
            "total_points": total_points,
            "points_value": float(total_points * 0.1),  # 1 point = ₹0.1
            "rewards": [
                {
                    "reward_id": reward.reward_id,
                    "points": reward.points,
                    "created_at": reward.created_at,
                }
                for reward in rewards
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/redeem-rewards/{points}", response_model=dict)
def redeem_rewards_path(
    points: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get user's reward points
        available_rewards = (
            db.query(RewardPoints)
            .filter(
                RewardPoints.user_id == current_user.user_id,
                RewardPoints.status == RewardStatus.earned,
            )
            .all()
        )

        total_points = sum(reward.points for reward in available_rewards)

        if points > total_points:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient reward points. Available: {total_points}",
            )

        # Calculate reward value (1 point = ₹0.1)
        # Convert to Decimal to match the account.balance type
        reward_value = Decimal(str(points * 0.1))

        # Get user's account
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )
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
                    created_at=datetime.now(),
                )
                db.add(new_reward)
                points_to_redeem = 0

        # Create transaction for reward redemption
        transaction = Transactions(
            account_id=account.account_id,
            amount=float(reward_value),  
            transaction_type=TransactionType.reward_redemption,
            status=TransactionStatus.completed,
            created_at=datetime.now(),
        )
        db.add(transaction)

        # Log transaction
        log = Logs(
            user_id=current_user.user_id,
            action="reward_redemption",
            description=f"Redeemed {points} points for ₹{float(reward_value)}",
            created_at=datetime.now(),
        )
        db.add(log)

        db.commit()

        return {
            "message": f"Successfully redeemed {points} points for ₹{float(reward_value)}",
            "new_balance": float(account.balance),
            "remaining_points": total_points - points,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/upload-profile-image")
def upload_profile_image(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Delete old image if exists
        if current_user.profile_image:
            old_image_path = current_user.profile_image
            delete_file(old_image_path)

        # Save the new profile image
        image_url = save_profile_image(file, current_user.user_id)

        # Update user profile in database
        current_user.profile_image = image_url
        db.commit()
        db.refresh(current_user)

        # Log the profile image update
        log = Logs(
            user_id=current_user.user_id,
            action="profile_update",
            description=f"User {current_user.user_id} updated profile image",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        return {"profile_image": image_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e
