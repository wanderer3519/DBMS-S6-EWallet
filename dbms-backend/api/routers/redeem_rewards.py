from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.database import get_db

router = APIRouter(prefix="/api/redeem-rewards", tags=["Redeem Rewards"])


@router.post("")
def redeem_rewards(account_id: int, points: int, db: Session = Depends(get_db)):
    try:
        query = text("SELECT redeem_rewards(:account_id, :points)")
        db.execute(query, {"account_id": account_id, "points": points})
        db.commit()

        return {"message": "Reward points redeemed successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e

