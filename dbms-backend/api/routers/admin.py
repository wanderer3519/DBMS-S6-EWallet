import logging
import os
from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import create_access_token, get_password_hash, verify_password
from api.database import get_db
from api.models import Account, AccountType, Logs, Order, UserRole, Users, UserStatus
from api.schemas import AdminStats, OrderStatus, Token, UserCreate, UserLogin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("/logs")
def get_logs(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Get all logs for admin dashboard - public endpoint for testing"""
    try:
        # Get user from token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(Users).filter(Users.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        if user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Fetch logs with user names
        query = text("""
            SELECT l.log_id, l.user_id, u.full_name, l.action, l.description, l.created_at
            FROM logs l
            JOIN users u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
        """)
        result = db.execute(query).fetchall()

        logs = [
            {
                "log_id": row[0],
                "user_id": row[1],
                "user_name": row[2],
                "action": row[3],
                "description": row[4],
                "created_at": row[5],
            }
            for row in result
        ]

        return {"logs": logs}
    except Exception as e:
        logger.info(f"Error fetching logs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching logs: {str(e)}",
        ) from e


@router.get("/stats", response_model=AdminStats)
async def get_api_admin_stats(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    try:
        # Verify token and get user
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=401, detail="Invalid authentication credentials"
                )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            ) from e

        # Get user from database
        user = db.query(Users).filter(Users.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user is admin
        if user.role != UserRole.admin:
            raise HTTPException(
                status_code=403, detail="Only admin users can access this endpoint"
            )

        # Get total users
        total_users = db.query(Users).count()

        # Get total orders
        total_orders = db.query(Order).count()

        # Get total revenue
        total_revenue = (
            db.query(Order)
            .filter(Order.status == OrderStatus.completed)
            .with_entities(text("SUM(total_amount)"))
            .scalar()
            or 0
        )

        # Get active merchants
        active_merchants = (
            db.query(Users)
            .filter(Users.role == UserRole.merchant, Users.status == UserStatus.active)
            .count()
        )

        return {
            "total_users": total_users,
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "active_merchants": active_merchants,
        }
    except Exception as e:
        logger.info(f"Error in admin stats API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# Admin specific endpoints
@router.post("/signup", response_model=Token)
async def admin_signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = db.query(Users).filter(Users.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate that role is admin
    if user.role != "admin":
        user.role = "admin"  # Force role to be admin for this endpoint

    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    db_user = Users(
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password,
        role=UserRole.admin,
        status=UserStatus.active,
        created_at=datetime.now(),
    )

    # Create admin user
    db.add(db_user)
    db.flush()  # Get the user_id without committing

    # Log admin creation
    log = Logs(
        user_id=db_user.user_id,
        action="admin_creation",
        description=f"Admin user {user.email} created",
        created_at=datetime.now(),
    )
    db.add(log)

    # Create account for new admin with zero balance
    account = Account(
        user_id=db_user.user_id,
        account_type=AccountType.user,
        balance=0.0,
        created_at=datetime.now(),
    )
    db.add(account)

    db.commit()

    # Create access token
    access_token = create_access_token(data={"sub": user.email})

    # Return token with user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.user_id,
        "email": db_user.email,
        "role": db_user.role.value,
        "name": db_user.full_name,
    }


@router.post("/login", response_model=Token)
def admin_login(user_data: UserLogin, db: Session = Depends(get_db)):
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

    # Check if user is admin
    if users.role != UserRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. Admin privileges required.",
        )

    # Create access token
    access_token = create_access_token(data={"sub": users.email})

    # Log admin login
    log = Logs(
        user_id=users.user_id,
        action="admin_login",
        description=f"Admin {users.email} logged in",
        created_at=datetime.now(),
    )
    db.add(log)
    db.commit()

    # Get user's account
    account = db.query(Account).filter(Account.user_id == users.user_id).first()

    # Return token with user and account information
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": users.user_id,
        "email": users.email,
        "role": users.role.value,
        "name": users.full_name,
        "account": {
            "id": account.account_id if account else None,
            "balance": float(account.balance) if account else 0.0,
        },
    }


@router.get("/orders")
async def get_admin_orders(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """Get all orders for admin dashboard"""
    try:
        # Verify token and get user
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=401, detail="Invalid authentication credentials"
                )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            ) from e

        # Get user from database
        user = db.query(Users).filter(Users.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user is admin
        if user.role != UserRole.admin:
            raise HTTPException(
                status_code=403, detail="Only admin users can access this endpoint"
            )

        # Join with users to get user details
        orders_with_users = (
            db.query(Order, Users.full_name.label("user_name"))
            .join(Users, Order.user_id == Users.user_id)
            .order_by(Order.created_at.desc())
            .all()
        )

        result = []
        for order_data, user_name in orders_with_users:
            result.append(
                {
                    "order_id": order_data.order_id,
                    "user_id": order_data.user_id,
                    "user_name": user_name,
                    "total_amount": float(order_data.total_amount),
                    "status": order_data.status.value,
                    "created_at": order_data.created_at,
                    "updated_at": order_data.updated_at,
                }
            )

        return result
    except Exception as e:
        logger.info(f"Error in admin orders API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/api/admin/logs")
async def get_admin_logs(
    action: str = None,
    date: str = None,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Get filtered logs for admin dashboard"""
    try:
        # Verify token and get user
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=401, detail="Invalid authentication credentials"
                )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=401, detail="Invalid authentication credentials"
            ) from e

        # Get user from database
        user = db.query(Users).filter(Users.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user is admin
        if user.role != UserRole.admin:
            raise HTTPException(
                status_code=403, detail="Only admin users can access this endpoint"
            )

        # Build query for logs
        query = (
            db.query(
                Logs,
                Users.full_name.label("user_name"),
                Users.email.label("user_email"),
                Users.role.label("user_role"),
            )
            .join(Users, Logs.user_id == Users.user_id)
            .order_by(Logs.created_at.desc())
        )

        # Apply filters if provided
        if action:
            query = query.filter(Logs.action == action)

        if date:
            # Filter for specific date
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            next_day = date_obj + timedelta(days=1)
            query = query.filter(
                Logs.created_at >= date_obj, Logs.created_at < next_day
            )

        # Execute query and format results
        log_results = query.all()
        logs = []

        for log, user_name, user_email, user_role in log_results:
            logs.append(
                {
                    "log_id": log.log_id,
                    "user_id": log.user_id,
                    "user_name": user_name,
                    "user_email": user_email,
                    "user_role": user_role.value if user_role else None,
                    "action": log.action,
                    "description": log.description,
                    "created_at": log.created_at,
                }
            )

        return {"logs": logs}
    except Exception as e:
        logger.info(f"Error in admin logs API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e
