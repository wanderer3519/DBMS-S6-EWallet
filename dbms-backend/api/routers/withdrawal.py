from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from api.database import get_db
from api.models import Account, Transaction  # adjust import to match your models
from datetime import datetime

router = APIRouter(prefix="/api/process-withdrawal", tags=["Withdrawal"])

@router.post("")
def process_withdrawal(account_id: int, amount: float, db: Session = Depends(get_db)):
    try:
        # 1. Find the account
        account = db.query(Account).filter(Account.account_id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # 2. Check if balance is enough
        if Decimal(account.balance) < Decimal(amount):
            raise HTTPException(status_code=400, detail="Insufficient balance")

        # 3. Deduct amount
        account.balance = Decimal(account.balance) - Decimal(amount)

        # 4. Record the withdrawal in transactions table
        withdrawal = Transaction(
            account_id=account.account_id,
            type="withdrawal",
            amount=Decimal(amount),
            created_at=datetime.now()
        )
        db.add(withdrawal)

        # 5. Commit changes
        db.commit()
        db.refresh(account)  # get updated balance from DB

        return {
            "message": "Withdrawal processed successfully",
            "account_id": account.account_id,
            "new_balance": float(account.balance)
        }

    except HTTPException:
        # Don't roll back here because HTTPException means controlled error
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
