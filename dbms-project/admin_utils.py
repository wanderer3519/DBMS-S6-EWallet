from sqlalchemy.orm import Session
from datetime import datetime
from models import Logs, Users, Order, OrderItem, Product, UserRole
from typing import List, Dict, Any
import json

def log_user_activity(
    db: Session,
    user_id: int,
    user_role: UserRole,
    action: str,
    description: str,
    entity_type: str = None,
    entity_id: int = None,
    metadata: Dict[str, Any] = None
) -> None:
    """Log user activity with detailed information"""
    log = Logs(
        user_id=user_id,
        user_role=user_role,
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=json.dumps(metadata) if metadata else None,
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()

def get_user_purchase_history(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Get detailed purchase history for a user"""
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    purchase_history = []
    
    for order in orders:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
        items = []
        for item in order_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            items.append({
                "product_id": product.product_id,
                "product_name": product.name,
                "quantity": item.quantity,
                "price_at_time": float(item.price_at_time)
            })
        
        purchase_history.append({
            "order_id": order.order_id,
            "total_amount": float(order.total_amount),
            "status": order.status.value,
            "created_at": order.created_at,
            "items": items
        })
    
    return purchase_history

def get_merchant_stock_updates(db: Session, merchant_id: int) -> List[Dict[str, Any]]:
    """Get stock update history for a merchant"""
    logs = db.query(Logs).filter(
        Logs.user_id == merchant_id,
        Logs.action == "stock_update"
    ).order_by(Logs.created_at.desc()).all()
    
    stock_updates = []
    for log in logs:
        metadata = json.loads(log.metadata) if log.metadata else {}
        stock_updates.append({
            "product_id": log.entity_id,
            "description": log.description,
            "metadata": metadata,
            "created_at": log.created_at
        })
    
    return stock_updates

def get_admin_dashboard_stats(db: Session) -> Dict[str, Any]:
    """Get comprehensive statistics for admin dashboard"""
    total_users = db.query(Users).filter(Users.role == UserRole.customer).count()
    total_merchants = db.query(Users).filter(Users.role == UserRole.merchant).count()
    total_orders = db.query(Order).count()
    total_products = db.query(Product).count()
    
    recent_activities = db.query(Logs).order_by(Logs.created_at.desc()).limit(10).all()
    activities = []
    for log in recent_activities:
        user = db.query(Users).filter(Users.user_id == log.user_id).first()
        activities.append({
            "user_id": log.user_id,
            "user_email": user.email if user else "Unknown",
            "user_role": log.user_role.value,
            "action": log.action,
            "description": log.description,
            "created_at": log.created_at
        })
    
    return {
        "total_users": total_users,
        "total_merchants": total_merchants,
        "total_orders": total_orders,
        "total_products": total_products,
        "recent_activities": activities
    }

def get_user_activity_summary(db: Session, user_id: int):
    """Get a summary of user's recent activities"""
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        return None

    # Get recent orders
    recent_orders = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).limit(5).all()
    
    # Get recent product additions (if merchant)
    recent_products = []
    if user.role == "merchant":
        merchant = db.query(Merchants).filter(Merchants.user_id == user_id).first()
        if merchant:
            recent_products = db.query(Product).filter(
                Product.merchant_id == merchant.merchant_id
            ).order_by(Product.created_at.desc()).limit(5).all()

    return {
        "user": {
            "id": user.user_id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        },
        "recent_orders": [
            {
                "order_id": order.order_id,
                "total_amount": order.total_amount,
                "status": order.status,
                "created_at": order.created_at
            } for order in recent_orders
        ],
        "recent_products": [
            {
                "product_id": product.product_id,
                "name": product.name,
                "price": product.price,
                "stock": product.stock,
                "created_at": product.created_at
            } for product in recent_products
        ]
    }

def get_activity_logs(
    db: Session,
    start_date: datetime = None,
    end_date: datetime = None,
    user_id: int = None,
    action: str = None
):
    """Get filtered activity logs"""
    query = db.query(Logs)
    
    if start_date:
        query = query.filter(Logs.created_at >= start_date)
    if end_date:
        query = query.filter(Logs.created_at <= end_date)
    if user_id:
        query = query.filter(Logs.user_id == user_id)
    if action:
        query = query.filter(Logs.action == action)
    
    return query.order_by(Logs.created_at.desc()).all()

def get_detailed_log_info(db: Session, log_id: int):
    """Get detailed information about a specific log entry"""
    log = db.query(Logs).filter(Logs.log_id == log_id).first()
    if not log:
        return None

    result = {
        "log_id": log.log_id,
        "user_id": log.user_id,
        "action": log.action,
        "description": log.description,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "created_at": log.created_at,
        "metadata": json.loads(log.metadata) if log.metadata else None
    }

    # Add entity-specific details
    if log.entity_type == "order" and log.entity_id:
        order = db.query(Order).filter(Order.order_id == log.entity_id).first()
        if order:
            order_items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
            result["order_details"] = {
                "order_id": order.order_id,
                "total_amount": order.total_amount,
                "status": order.status,
                "items": [
                    {
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "price": item.price_at_time
                    } for item in order_items
                ]
            }

    elif log.entity_type == "product" and log.entity_id:
        product = db.query(Product).filter(Product.product_id == log.entity_id).first()
        if product:
            result["product_details"] = {
                "product_id": product.product_id,
                "name": product.name,
                "price": product.price,
                "stock": product.stock
            }

    return result