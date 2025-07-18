from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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


@router.get("/me", response_model=dict)
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
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
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
