import logging
from datetime import datetime

from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import create_access_token, get_password_hash
from models import Account, AccountType, Logs, Users, UserStatus
from schemas import Token, UserCreate, UserLogin
from sqlalchemy.orm import Session

from api.auth import verify_password

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Start a transaction
        db.begin()

        # Check if user already exists
        db_user = db.query(Users).filter(Users.email == user.email).first()
        if db_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered",
            )

        # Create new user
        hashed_password = get_password_hash(user.password)
        db_user = Users(
            email=user.email,
            full_name=user.full_name,
            password_hash=hashed_password,
            role=user.role,
            status=UserStatus.active,
            created_at=datetime.now(),
        )

        db.add(db_user)
        db.flush()  # Get the user_id without committing

        # Create account for new user with zero balance
        account = Account(
            user_id=db_user.user_id,
            account_type=AccountType.user,
            balance=0.0,
            created_at=datetime.now(),
        )
        db.add(account)

        # Log user creation
        log = Logs(
            user_id=db_user.user_id,
            action="user_creation",
            description=f"User {user.email} created with role {user.role}",
            created_at=datetime.now(),
        )
        db.add(log)

        # Commit all changes
        db.commit()

        # Create access token
        access_token = create_access_token(data={"sub": user.email})

        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        # Rollback on error
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating user: {str(e)}",
        ) from e


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        # Find user by email
        users = db.query(Users).filter(Users.email == user_data.email).first()
        if not users:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
            )

        # Verify password
        if not verify_password(user_data.password, users.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
            )

        # Create access token
        access_token = create_access_token(data={"sub": users.email})

        # Log login
        log = Logs(
            user_id=users.user_id,
            action="user_login",
            description=f"User {users.email} logged in",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        # Get user's account
        db.query(Account).filter(Account.user_id == users.user_id).first()

        # Return token with user and account information
        return Token(
            access_token=access_token, token_type="bearer", user_id=users.user_id
        )

    except Exception as e:
        logger.info(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during login",
        ) from e
