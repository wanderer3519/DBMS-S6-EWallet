from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import Account, Transactions, TransactionStatus
from api.schemas import Logs, TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transaction", tags=["Transaction"])


@router.post("", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    try:
        # Check if account exists
        account = (
            db.query(Account)
            .filter(Account.account_id == transaction.account_id)
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Create transaction
        db_transaction = Transactions(
            account_id=transaction.account_id,
            amount=transaction.amount,
            transaction_type=transaction.transaction_type,
            status=TransactionStatus.pending,
            created_at=datetime.now(),
        )

        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)

        # Log transaction
        log = Logs(
            user_id=account.user_id,
            action="transaction_creation",
            description=f"Transaction {db_transaction.transaction_id} created for account {transaction.account_id}",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        return db_transaction

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/account/{account_id}", response_model=list[TransactionResponse])
def fetch_transactions(account_id: int, db: Session = Depends(get_db)):
    transactions = (
        db.query(Transactions).filter(Transactions.account_id == account_id).all()
    )
    return transactions
