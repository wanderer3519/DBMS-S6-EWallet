from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from api.models import Account, Logs, RewardPoints, RewardStatus


def convert_reward_points_to_wallet(
    user_id: int, earned_points: int, db: Session
) -> float:
    """
    Automatically converts reward points to wallet balance
    Returns the amount added to the wallet
    """
    if earned_points <= 0:
        return 0.0

    # Calculate reward value (1 point = ₹0.1)
    # Convert to Decimal to match the account.balance type
    reward_value = Decimal(str(earned_points * 0.1))

    # Get user's account
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        return 0.0

    # Update account balance
    account.balance += reward_value

    # Update reward status to redeemed
    reward = (
        db.query(RewardPoints)
        .filter(
            RewardPoints.user_id == user_id,
            RewardPoints.points == earned_points,
            RewardPoints.status == RewardStatus.earned,
        )
        .order_by(RewardPoints.created_at.desc())
        .first()
    )

    if reward:
        reward.status = RewardStatus.redeemed

    # Log transaction
    log = Logs(
        user_id=user_id,
        action="reward_conversion",
        description=f"Converted {earned_points} reward points to ₹{float(reward_value)} in wallet",
        created_at=datetime.now(),
    )
    db.add(log)

    return float(reward_value)
