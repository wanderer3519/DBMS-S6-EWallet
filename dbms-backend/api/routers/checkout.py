from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth_lib import get_current_user
from api.database import get_db
from api.models import (
    Account,
    Cart,
    CartItem,
    Logs,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    RewardPoints,
    RewardStatus,
    Transactions,
    TransactionStatus,
    TransactionType,
    Users,
)
from api.schemas import OrderResponse

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])


@router.post("", response_model=OrderResponse)
def process_checkout(
    payment_method: str = Body(None),
    use_wallet: bool = Body(False),
    use_rewards: bool = Body(False),
    reward_points: int | None = Body(None),
    order_date: str | None = Body(None),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get user's cart(Finds the cart belonging to the logged-in user.)
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")

        # Get cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # Calculate total and check stock
        total = 0.0
        order_items = []

        for item in cart_items:
            product = (
                db.query(Product).filter(Product.product_id == item.product_id).first()
            )
            if not product:
                raise HTTPException(
                    status_code=404, detail=f"Product {item.product_id} not found"
                )
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for product {product.name}",
                )
            # Convert Decimal to float for calculations
            item_price = float(product.price)
            item_total = item_price * item.quantity
            total += item_total
            order_items.append((product, item.quantity))

        # Get user's account(Retrieves the user’s wallet/account info)
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Calculate reward discount if using rewards
        reward_discount = 0.0
        if use_rewards and reward_points:
            # Get user's available reward points
            available_rewards = (
                db.query(RewardPoints)
                .filter(
                    RewardPoints.user_id == current_user.user_id,
                    RewardPoints.status == RewardStatus.earned,
                )
                .all()
            )

            total_points = sum(reward.points for reward in available_rewards)
            if reward_points > total_points:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient reward points. Available: {total_points}",
                )

            # Calculate reward value (1 point = ₹0.1)
            reward_discount = float(reward_points) * 0.1

        # Calculate wallet amount to use
        wallet_amount = 0.0
        if use_wallet:
            if account.balance > 0:
                # Convert Decimal to float for calculations
                account_balance = float(account.balance)
                wallet_amount = min(total, account_balance)
            else:
                raise HTTPException(
                    status_code=400, detail="Insufficient wallet balance"
                )

        # Calculate final amount after discounts
        final_amount = total - reward_discount - wallet_amount

        if final_amount < 0:
            final_amount = 0

        # Check if account balance is sufficient if using wallet only
        if payment_method == "wallet" and final_amount > 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient wallet balance. Please select another payment method.",
            )

        # Create order
        created_at = datetime.now()
        if order_date:
            try:
                created_at = datetime.fromisoformat(order_date.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                # If there's any error parsing the date, use current time
                pass

        db_order = Order(
            user_id=current_user.user_id,
            account_id=account.account_id,
            total_amount=total,
            payment_method=payment_method,
            wallet_amount=wallet_amount,
            reward_discount=reward_discount,
            status=OrderStatus.pending,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)

        # Create order items and update stock
        for product, quantity in order_items:
            order_item = OrderItem(
                order_id=db_order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                price_at_time=float(product.price),
                created_at=created_at,
            )
            db.add(order_item)
            product.stock -= quantity
            product.updated_at = created_at

        # Update account balance if using wallet
        if wallet_amount > 0:
            account.balance -= Decimal(str(wallet_amount))

        # Process reward points redemption if used
        if use_rewards and reward_points:
            points_to_redeem = reward_points
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
                        transaction_id=db_order.order_id,
                        user_id=reward.user_id,
                        points=remaining_points,
                        status=RewardStatus.earned,
                        created_at=created_at,
                    )
                    db.add(new_reward)
                    points_to_redeem = 0

        # Create transaction for the purchase
        transaction = Transactions(
            account_id=account.account_id,
            amount=total,
            transaction_type=TransactionType.purchase,
            status=TransactionStatus.completed,
            created_at=created_at,
        )
        db.add(transaction)
        db.flush()  # Flush to get the transaction ID
        db.commit()
        db.refresh(transaction)

        # Add reward points (5% of total amount) AFTER transaction creation
        earned_points = 0
        if payment_method != "cod":
            earned_points = int(total * 0.05)  # 5% of order total
            if earned_points > 0:
                reward = RewardPoints(
                    transaction_id=transaction.transaction_id,  # Use transaction ID
                    user_id=current_user.user_id,
                    points=earned_points,
                    status=RewardStatus.earned,
                    created_at=created_at,
                )
                db.add(reward)
                db.commit()

                # Automatically convert reward points to wallet balance
                # convert_reward_points_to_wallet(current_user.user_id, earned_points, db)

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()

        # Log order
        log = Logs(
            user_id=current_user.user_id,
            action="order_creation",
            description=f"Order {db_order.order_id} created. Total: ₹{total}, Wallet: ₹{wallet_amount}, Rewards: ₹{reward_discount}",
            created_at=created_at,
        )
        db.add(log)

        db.commit()

        # Get order items with product details
        items = []
        for item in order_items:
            product = item[0]
            quantity = item[1]
            items.append(
                {
                    "order_item_id": 0,  # Will be set by the database
                    "order_id": db_order.order_id,
                    "product_id": product.product_id,
                    "quantity": quantity,
                    "price_at_time": float(product.price),
                    "created_at": created_at,
                    "name": product.name,
                    "image_url": product.image_url,
                }
            )

        return {
            "order_id": db_order.order_id,
            "user_id": current_user.user_id,
            "account_id": account.account_id,
            "status": db_order.status,
            "total_amount": float(total),
            "payment_method": payment_method,
            "wallet_amount": float(wallet_amount),
            "reward_discount": float(reward_discount),
            "created_at": created_at,
            "updated_at": created_at,
            "items": items,
            "reward_points_earned": earned_points,
        }
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e
