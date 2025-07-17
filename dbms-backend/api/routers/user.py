from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database import get_db
from api.models import Account, Users
from api.schemas import UserProfileResponse

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/user/profile/{user_id}", response_model=UserProfileResponse)
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


@router.get("/user/me", response_model=dict)
async def get_current_user_info(
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


@router.get("/user/balance", response_model=dict)
async def get_user_balance(
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
