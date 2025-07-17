from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.database import get_db

router = APIRouter(prefix="/api/process-withdrawal", tags=["Withdrawal"])


@router.post("")
def process_withdrawal(account_id: int, amount: float, db: Session = Depends(get_db)):
    try:
        query = text("SELECT process_withdrawal(:account_id, :amount)")
        db.execute(query, {"account_id": account_id, "amount": amount})
        db.commit()

        return {"message": "Withdrawal processed successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
