# Cart Endpoints
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database import get_db
from api.models import Cart, CartItem, Logs, Product, Users
from api.schemas import CartItemCreate, CartResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.post("", response_model=CartResponse)
async def add_to_cart(
    item: CartItemCreate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get or create cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            cart = Cart(
                user_id=current_user.user_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(cart)
            db.commit()
            db.refresh(cart)

        # Check product exists and has stock
        product = (
            db.query(Product).filter(Product.product_id == item.product_id).first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")

        # Add or update cart item
        cart_item = (
            db.query(CartItem)
            .filter(
                CartItem.cart_id == cart.cart_id, CartItem.product_id == item.product_id
            )
            .first()
        )

        if cart_item:
            cart_item.quantity += item.quantity
            cart_item.updated_at = datetime.now()
        else:
            cart_item = CartItem(
                cart_id=cart.cart_id,
                product_id=item.product_id,
                quantity=item.quantity,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(cart_item)

        db.commit()

        # Calculate total and get updated cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        total = 0
        items = []

        for cart_item in cart_items:
            product = (
                db.query(Product)
                .filter(Product.product_id == cart_item.product_id)
                .first()
            )
            if product:
                total += cart_item.quantity * product.price
                items.append(
                    {
                        "product_id": cart_item.product_id,
                        "quantity": cart_item.quantity,
                        "price": product.price,
                        "name": product.name,
                        "image_url": product.image_url,
                    }
                )

        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} added product {item.product_id} to cart",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        return {"cart_id": cart.cart_id, "items": items, "total_amount": total}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/user/{user_id}", response_model=CartResponse)
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        return {"cart_id": 0, "items": [], "total_amount": 0}

    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    total = 0
    items = []

    for item in cart_items:
        product = (
            db.query(Product).filter(Product.product_id == item.product_id).first()
        )
        if product:
            total += item.quantity * product.price
            items.append(
                {
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price": product.price,
                    "name": product.name,
                }
            )

    return {"cart_id": cart.cart_id, "items": items, "total_amount": total}


@router.delete("/product/{product_id}")
async def remove_from_cart(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")

        # Find and delete the cart item
        cart_item = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.cart_id, CartItem.product_id == product_id)
            .first()
        )

        if not cart_item:
            raise HTTPException(status_code=404, detail="Item not found in cart")

        db.delete(cart_item)

        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} removed product {product_id} from cart",
            created_at=datetime.now(),
        )
        db.add(log)

        db.commit()
        return {"message": "Item removed from cart successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("", response_model=CartResponse)
async def get_current_user_cart(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            return {
                "cart_id": 0,
                "user_id": current_user.user_id,
                "items": [],
                "total_amount": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }

        # Get cart items with product details
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        items = []
        total = 0

        for item in cart_items:
            product = (
                db.query(Product).filter(Product.product_id == item.product_id).first()
            )
            if product:
                total += item.quantity * product.price
                items.append(
                    {
                        "cart_item_id": item.cart_item_id,
                        "cart_id": item.cart_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "user_id": current_user.user_id,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at,
                        "name": product.name,
                        "price": product.price,
                        "image_url": product.image_url,
                        "category": product.business_category,
                    }
                )

        return {
            "cart_id": cart.cart_id,
            "user_id": current_user.user_id,
            "items": items,
            "total_amount": total,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/product/{product_id}", response_model=CartResponse)
async def update_cart_item(
    product_id: int,
    quantity: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Get user's cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")

        # Check product exists and has stock
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")

        # Update cart item
        cart_item = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.cart_id, CartItem.product_id == product_id)
            .first()
        )

        if not cart_item:
            raise HTTPException(status_code=404, detail="Item not found in cart")

        cart_item.quantity = quantity
        cart_item.updated_at = datetime.now()

        # Log cart update
        log = Logs(
            user_id=current_user.user_id,
            action="cart_update",
            description=f"User {current_user.user_id} updated quantity of product {product_id} to {quantity}",
            created_at=datetime.now(),
        )
        db.add(log)

        db.commit()

        # Get updated cart items
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
        total = 0
        items = []

        for item in cart_items:
            product = (
                db.query(Product).filter(Product.product_id == item.product_id).first()
            )
            if product:
                total += item.quantity * product.price
                items.append(
                    {
                        "cart_item_id": item.cart_item_id,
                        "cart_id": item.cart_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "user_id": current_user.user_id,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at,
                        "name": product.name,
                        "price": product.price,
                        "image_url": product.image_url,
                        "category": product.business_category,
                    }
                )

        return {
            "cart_id": cart.cart_id,
            "user_id": current_user.user_id,
            "items": items,
            "total_amount": total,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e
