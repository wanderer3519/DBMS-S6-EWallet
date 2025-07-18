from datetime import datetime, timedelta
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

router = APIRouter(prefix="/api/order", tags=["Order"])


@router.post("", response_model=OrderResponse)
def create_order(
    payment_method: str = Body(...),
    use_wallet: bool = Body(False),
    use_rewards: bool = Body(False),
    reward_points: int | None = Body(None),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")

        # Calculate total amount
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        total = 0
        order_items = []
        for cart_item in cart_items:
            product = (
                db.query(Product)
                .filter(Product.product_id == cart_item.product_id)
                .first()
            )
            if not product:
                raise HTTPException(
                    status_code=404, detail=f"Product {cart_item.product_id} not found"
                )

            if product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for product {product.name}",
                )

            total += product.price * cart_item.quantity
            order_items.append((product, cart_item.quantity))

        # Apply rewards if requested
        reward_discount = 0
        if use_rewards and reward_points:
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

            reward_discount = float(reward_points * 0.1)
            total -= reward_discount

        # Get user's account
        account = (
            db.query(Account).filter(Account.user_id == current_user.user_id).first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Handle wallet payment
        wallet_amount = 0
        remaining_amount = total
        if use_wallet:
            wallet_amount = min(account.balance, total)
            remaining_amount = total - wallet_amount

            if wallet_amount > 0:
                # Deduct from wallet
                account.balance -= wallet_amount

                # Create wallet transaction
                wallet_transaction = Transactions(
                    account_id=account.account_id,
                    amount=wallet_amount,
                    transaction_type=TransactionType.purchase,
                    status=TransactionStatus.completed,
                    created_at=datetime.now(),
                )
                db.add(wallet_transaction)

        # Handle remaining amount with other payment method if needed
        if remaining_amount > 0 and payment_method not in ["card", "upi"]:
            raise HTTPException(
                status_code=400, detail="Invalid payment method for remaining amount"
            )

        # Create order
        db_order = Order(
            user_id=current_user.user_id,
            total_amount=total,
            wallet_amount=wallet_amount,
            reward_discount=reward_discount,
            payment_method=payment_method,
            status=OrderStatus.completed,
            created_at=datetime.now(),
        )
        db.add(db_order)
        db.flush()

        # Create order items and update product stock
        for product, quantity in order_items:
            order_item = OrderItem(
                order_id=db_order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                price=product.price,
            )
            db.add(order_item)

            # Update product stock
            product.stock -= quantity

        # Add reward points (5% of total amount before discount)
        earned_points = int((total + reward_discount) * 0.05)  # 5% of original total
        if earned_points > 0 and payment_method != "cod":
            reward = RewardPoints(
                transaction_id=db_order.order_id,
                user_id=current_user.user_id,
                points=earned_points,
                status=RewardStatus.earned,
                created_at=datetime.now(),
            )
            db.add(reward)

            # AUTO-CONVERSION: Immediately convert earned points to wallet balance
            # Calculate reward value (1 point = ₹0.1)
            reward_value = float(earned_points * 0.1)

            # Add to account balance
            account.balance += reward_value

            # Update reward points status to redeemed
            reward.status = RewardStatus.redeemed

            # Create transaction for automatic reward redemption
            auto_redeem_transaction = Transactions(
                account_id=account.account_id,
                amount=reward_value,
                transaction_type=TransactionType.reward_redemption,
                status=TransactionStatus.completed,
                created_at=datetime.now(),
            )
            db.add(auto_redeem_transaction)

            # Log automatic redemption
            auto_redeem_log = Logs(
                user_id=current_user.user_id,
                action="auto_reward_redemption",
                description=f"Automatically redeemed {earned_points} points for ₹{reward_value}",
                created_at=datetime.now(),
            )
            db.add(auto_redeem_log)

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
                        transaction_id=reward.transaction_id,
                        user_id=reward.user_id,
                        points=remaining_points,
                        status=RewardStatus.earned,
                        created_at=datetime.now(),
                    )
                    db.add(new_reward)
                    points_to_redeem = 0

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()

        # Log order
        log = Logs(
            user_id=current_user.user_id,
            action="order_creation",
            description=f"Order {db_order.order_id} created. Total: ₹{total}, Wallet: ₹{wallet_amount}, Rewards: ₹{reward_discount}",
            created_at=datetime.now(),
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
                    "created_at": datetime.now(),
                    "name": product.name,
                    "image_url": product.image_url,
                }
            )

        return {
            "order_id": db_order.order_id,
            "user_id": current_user.user_id,
            "account_id": account.account_id,
            "status": db_order.status,
            "total_amount": total,
            "created_at": db_order.created_at,
            "updated_at": db_order.created_at,
            "items": items,
            "reward_points_earned": earned_points if payment_method != "cod" else 0,
            "payment_method": payment_method,
        }

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/user/{user_id}", response_model=list[OrderResponse])
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_details(
    order_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get order
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id, Order.user_id == current_user.user_id)
            .first()
        )

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Get order items
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()

        # Get product details for each item
        items = []
        for item in order_items:
            product = (
                db.query(Product).filter(Product.product_id == item.product_id).first()
            )
            if product:
                items.append(
                    {
                        "order_item_id": item.order_item_id,
                        "order_id": item.order_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "price_at_time": float(item.price_at_time),
                        "created_at": item.created_at,
                        "name": product.name,
                        "image_url": product.image_url,
                    }
                )

        # Get reward points earned for this order
        reward_points_earned = 0
        reward_points_transaction = (
            db.query(RewardPoints)
            .filter(
                RewardPoints.transaction_id == order_id,
                RewardPoints.user_id == current_user.user_id,
            )
            .first()
        )

        if reward_points_transaction:
            reward_points_earned = reward_points_transaction.points

        return {
            "order_id": order.order_id,
            "user_id": order.user_id,
            "account_id": order.account_id,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": items,
            "reward_points_earned": reward_points_earned,
            "payment_method": order.payment_method,
            "wallet_amount": float(order.wallet_amount) if order.wallet_amount else 0.0,
            "reward_discount": float(order.reward_discount)
            if order.reward_discount
            else 0.0,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("", response_model=list[OrderResponse])
def get_all_orders(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get all orders for current user
        orders = (
            db.query(Order)
            .filter(Order.user_id == current_user.user_id)
            .order_by(Order.created_at.desc())
            .all()
        )

        all_order_data = []

        for order in orders:
            # Get order items
            order_items = (
                db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
            )

            # Get product details for each item
            items = []
            for item in order_items:
                product = (
                    db.query(Product)
                    .filter(Product.product_id == item.product_id)
                    .first()
                )
                if product:
                    items.append(
                        {
                            "order_item_id": item.order_item_id,
                            "order_id": item.order_id,
                            "product_id": item.product_id,
                            "quantity": item.quantity,
                            "price_at_time": float(item.price_at_time),
                            "created_at": item.created_at,
                            "name": product.name,
                            "image_url": product.image_url,
                        }
                    )

            # Get reward points earned for this order
            reward_points_earned = 0
            reward_points_transaction = (
                db.query(RewardPoints)
                .filter(
                    RewardPoints.transaction_id == order.order_id,
                    RewardPoints.user_id == current_user.user_id,
                )
                .first()
            )

            if reward_points_transaction:
                reward_points_earned = reward_points_transaction.points

            # Append order response
            all_order_data.append(
                {
                    "order_id": order.order_id,
                    "user_id": order.user_id,
                    "account_id": order.account_id,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                    "items": items,
                    "reward_points_earned": reward_points_earned,
                    "payment_method": order.payment_method,
                    "wallet_amount": float(order.wallet_amount)
                    if order.wallet_amount
                    else 0.0,
                    "reward_discount": float(order.reward_discount)
                    if order.reward_discount
                    else 0.0,
                }
            )

        return all_order_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/user/current", response_model=list[OrderResponse])
def get_current_user_orders(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        # Get all orders for the current user
        orders = db.query(Order).filter(Order.user_id == current_user.user_id).all()

        # Get order items for each order
        result = []
        for order in orders:
            order_items = (
                db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
            )

            # Get product details for each item
            items = []
            for item in order_items:
                product = (
                    db.query(Product)
                    .filter(Product.product_id == item.product_id)
                    .first()
                )
                if product:
                    items.append(
                        {
                            "order_item_id": item.order_item_id,
                            "order_id": item.order_id,
                            "product_id": item.product_id,
                            "quantity": item.quantity,
                            "price_at_time": float(item.price_at_time),
                            "created_at": item.created_at,
                            "name": product.name,
                            "image_url": product.image_url,
                        }
                    )

            # Get reward points earned for this order
            # First find the transaction associated with this order
            transaction = (
                db.query(Transactions)
                .filter(
                    Transactions.account_id == order.account_id,
                    Transactions.transaction_type == TransactionType.purchase,
                    Transactions.created_at.between(
                        order.created_at - timedelta(seconds=10),
                        order.created_at + timedelta(seconds=10),
                    ),
                )
                .first()
            )

            reward_points_earned = 0
            if transaction:
                # Then get reward points using the correct transaction ID
                reward = (
                    db.query(RewardPoints)
                    .filter(
                        RewardPoints.transaction_id == transaction.transaction_id,
                        RewardPoints.user_id == current_user.user_id,
                        RewardPoints.status == RewardStatus.earned,
                    )
                    .first()
                )

                reward_points_earned = reward.points if reward else 0
                reward_discount = reward_points_earned * 0.1

            result.append(
                {
                    "order_id": order.order_id,
                    "user_id": order.user_id,
                    "account_id": order.account_id,
                    "reward_discount": reward_discount,
                    "wallet_amount": float(order.wallet_amount)
                    if order.wallet_amount
                    else 0.0,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "created_at": order.created_at,
                    "updated_at": order.updated_at,
                    "items": items,
                    "reward_points_earned": reward_points_earned,
                    # "payment_method": order.payment_method
                }
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get order
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id, Order.user_id == current_user.user_id)
            .first()
        )

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Check if order is already completed or cancelled
        if order.status in [OrderStatus.completed, OrderStatus.cancelled]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel order with status '{order.status}'",
            )

        # Update order status to cancelled
        order.status = OrderStatus.cancelled

        # Get user account to refund
        account = (
            db.query(Account).filter(Account.account_id == order.account_id).first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Refund the amount to wallet
        refund_amount = float(order.total_amount)
        account.balance += Decimal(str(refund_amount))

        # Create refund transaction
        refund_transaction = Transactions(
            account_id=account.account_id,
            transaction_type=TransactionType.refund,
            amount=Decimal(str(refund_amount)),
            status=TransactionStatus.completed,
        )
        db.add(refund_transaction)

        # Log the cancellation
        log_entry = Logs(
            user_id=current_user.user_id,
            action="order_cancelled",
            description=f"Order {order_id} cancelled. Amount ₹{refund_amount} refunded to wallet.",
        )
        db.add(log_entry)

        db.commit()

        return {
            "success": True,
            "message": f"Order {order_id} has been cancelled and ₹{refund_amount} has been refunded to your wallet.",
            "refund_amount": refund_amount,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e
