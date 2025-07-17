import logging
from datetime import datetime

from database import get_db
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from api.auth import (
    create_access_token,
    get_current_merchant_user,
    get_current_user,
    get_password_hash,
    verify_password,
)
from api.file_upload import delete_file, save_uploaded_file
from api.models import Logs, Merchants, Product, ProductStatus, UserRole, Users
from api.schemas import ProductResponse, Token, UserCreate, UserLogin, UserStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/merchant", tags=["Merchant"])


@router.get("/products", response_model=list[ProductResponse])
async def get_merchant_products(
    current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role != UserRole.merchant:
        raise HTTPException(
            status_code=403,
            detail="Only merchants can access their products",
        )

    products = (
        db.query(Product).filter(Product.merchant_id == current_user.user_id).all()
    )
    return products


@router.post("/products/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user),
):
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Save the file
        image_url = await save_uploaded_file(file)

        return {"image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/products", response_model=ProductResponse)
async def create_merchant_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    mrp: float = Form(...),
    stock: int = Form(...),
    business_category: str = Form(...),
    image: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant
        merchant = (
            db.query(Merchants)
            .filter(
                Merchants.user_id == current_user.user_id,
                Merchants.business_category == business_category,
            )
            .first()
        )

        merchant2 = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )

        if not merchant:
            # Create a new merchant entry for this business category
            current_time = datetime.now()
            merchant = Merchants(
                user_id=current_user.user_id,
                merchant_id=current_user.user_id,  # Using user_id as merchant_id
                business_name=current_user.full_name,
                business_category=business_category,
                name=current_user.full_name,
                email=current_user.email,
                contact=current_user.contact or "",  # Use contact from Users table
                created_at=current_time,
                updated_at=current_time,
            )
            db.add(merchant)
            db.flush()  # Get the merchant_id without committing

        # Reset the products sequence
        try:
            db.execute(
                text(
                    "SELECT setval('products_product_id_seq', (SELECT COALESCE(MAX(product_id), 0) FROM products))"
                )
            )
        except Exception as e:
            logger.info(f"Error resetting sequence: {e}")

        # Save the image
        image_url = await save_uploaded_file(image)

        # Create product with current timestamp
        current_time = datetime.now()
        product = Product(
            merchant_id=merchant.merchant_id,
            name=name,
            description=description,
            price=price,
            mrp=mrp,
            stock=stock,
            business_category=business_category,
            image_url=image_url,
            status=ProductStatus.active,
            created_at=current_time,
            updated_at=current_time,
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        return product
    except Exception as e:
        # If there was an error, try to delete the uploaded file if it exists
        if "image_url" in locals():
            delete_file(image_url)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_merchant_product(
    product_id: int,
    request: Request,
    name: str | None = Form(None),
    description: str | None = Form(None),
    price: float | None = Form(None),
    mrp: float | None = Form(None),
    stock: int | None = Form(None),
    business_category: str | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant
        merchant = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Get product
        product = (
            db.query(Product)
            .filter(
                Product.product_id == product_id,
                Product.merchant_id == merchant.merchant_id,
            )
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Determine if this is a JSON request or a form request
        content_type = request.headers.get("Content-Type", "")
        is_json = "application/json" in content_type

        # If this is a JSON request, parse the JSON body
        if is_json:
            try:
                json_data = await request.json()
                name = json_data.get("name", name)
                description = json_data.get("description", description)
                price = json_data.get("price", price)
                mrp = json_data.get("mrp", mrp)
                stock = json_data.get("stock", stock)
                business_category = json_data.get(
                    "business_category", business_category
                )
                # Note: JSON requests can't handle file uploads, so image remains None
            except Exception as e:
                # If JSON parsing fails, continue with form data
                logger.info(f"Error parsing JSON: {e}")
                pass

        # Update fields if provided
        if name is not None:
            product.name = name
        if description is not None:
            product.description = description
        if price is not None:
            product.price = price
        if mrp is not None:
            product.mrp = mrp
        if stock is not None:
            product.stock = stock
        if business_category is not None:
            product.business_category = business_category

        # Handle image update
        if image is not None and image.filename:
            # Delete old image if exists
            if product.image_url:
                await delete_file(product.image_url)

            # Save new image
            product.image_url = await save_uploaded_file(image)

        # Update timestamp
        product.updated_at = datetime.now()

        # Keep the original created_at timestamp
        if not product.created_at:
            product.created_at = datetime.now()

        db.commit()
        db.refresh(product)

        # Add a log entry for this update
        log = Logs(
            user_id=current_user.user_id,
            action="product_update",
            description=f"Updated product {product.name} (ID: {product.product_id})",
            created_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/products/{product_id}")
async def delete_merchant_product(
    product_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "merchant":
        raise HTTPException(
            status_code=403,
            detail="Only merchants can delete products",
        )

    db_product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.merchant_id == current_user.user_id,
        )
        .first()
    )

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}


# Product Management Endpoints
@router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    mrp: float = Form(...),
    stock: int = Form(...),
    image: UploadFile = File(...),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant record
        merchant = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Save the image
        image_url = await save_uploaded_file(image, "products")

        # Create product
        product = Product(
            merchant_id=merchant.merchant_id,
            name=name,
            description=description,
            price=price,
            mrp=mrp,
            stock=stock,
            image_url=image_url,
            status=ProductStatus.active,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/products", response_model=list[ProductResponse])
async def get_merchant_products(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    merchant = (
        db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    )
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    products = (
        db.query(Product).filter(Product.merchant_id == merchant.merchant_id).all()
    )
    return products


@router.put("/merchant/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: str | None = Form(None),
    description: str | None = Form(None),
    price: float | None = Form(None),
    mrp: float | None = Form(None),
    stock: int | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    # Get merchant record
    merchant = (
        db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    )
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    # Get product
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.merchant_id == merchant.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update fields if provided
    if name is not None:
        product.name = name
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if mrp is not None:
        product.mrp = mrp
    if stock is not None:
        product.stock = stock
    if image is not None:
        # Delete old image if exists
        if product.image_url:
            await delete_file(product.image_url)
        # Save new image
        product.image_url = await save_uploaded_file(image, "products")

    product.updated_at = datetime.now()
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    # Get merchant record
    merchant = (
        db.query(Merchants).filter(Merchants.user_id == current_user.user_id).first()
    )
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    # Get product
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.merchant_id == merchant.merchant_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete product image if exists
    if product.image_url:
        await delete_file(product.image_url)

    # Delete product
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}


# Merchant Signup and Login
@router.post("/signup", response_model=Token)
async def merchant_signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(Users).filter(Users.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed_password = get_password_hash(user.password)

    try:
        # Create new user
        db_user = Users(
            email=user.email,
            full_name=user.full_name,
            password_hash=hashed_password,
            role=UserRole.merchant,
            status=UserStatus.active,
            phone=user.contact,  # Store contact as phone
            created_at=datetime.now(),
        )
        db.add(db_user)
        db.flush()  # Flush to get the user_id

        # Create merchant profile with required fields
        merchant = Merchants(
            user_id=db_user.user_id,
            merchant_id=db_user.user_id,  # Use user_id as merchant_id
            business_name=user.full_name,  # Use full_name as business_name
            business_category="General",  # Default category
            name=user.full_name,
            email=user.email,
            contact=user.contact or "",  # Use contact from user input
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(merchant)
        db.commit()
        db.refresh(db_user)

        # Create access token
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating merchant: {str(e)}",
        ) from e


@router.post("/login", response_model=Token)
def merchant_login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        users = db.query(Users).filter(Users.email == user_data.email).first()
        if not users or users.role != UserRole.merchant:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
            )
        if not verify_password(user_data.password, users.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
            )
        access_token = create_access_token(data={"sub": users.email})
        return Token(
            access_token=access_token, token_type="bearer", user_id=users.user_id
        )
    except Exception as e:
        logger.info(f"Error during merchant login: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during login",
        ) from e


# Merchant Product Management
@router.get("/{merchant_id}/logs")
async def get_merchant_logs(
    merchant_id: int,
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    if current_user.user_id != merchant_id:
        raise HTTPException(
            status_code=403,
            detail="Can only access your own logs",
        )

    # Get all products for this merchant
    products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
    _product_ids = [p.product_id for p in products]

    # Query logs for these products
    logs = []
    for product in products:
        # Get creation log

        logs.append(
            {
                "product_name": product.name,
                "action": "Product Created",
                "business_category": product.business_category,
                "price": product.price,
                "stock": product.stock,
                "description": product.description,
                "timestamp": product.created_at,
            }
        )

        # Get update logs if the product was updated
        if product.updated_at > product.created_at:
            logs.append(
                {
                    "product_name": product.name,
                    "action": "Product Updated",
                    "business_category": product.business_category,
                    "price": product.price,
                    "stock": product.stock,
                    "description": product.description,
                    "timestamp": product.updated_at,
                }
            )

    # Sort logs by timestamp (newest first)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)

    return logs


@router.get("/api/merchant/profile", response_model=dict)
async def get_merchant_profile(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant profile
        merchant = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        return {
            "merchant_id": merchant.merchant_id,
            "business_name": merchant.business_name,
            "business_category": merchant.business_category,
            "name": merchant.name,
            "email": merchant.email,
            "contact": merchant.contact,
            "created_at": merchant.created_at,
            "updated_at": merchant.updated_at,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/api/merchant/stats", response_model=dict)
async def get_merchant_stats(
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant profile
        merchant = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Get total products count
        total_products = (
            db.query(func.count(Product.product_id))
            .filter(Product.merchant_id == merchant.merchant_id)
            .scalar()
            or 0
        )

        # Get active listings (products with status = active)
        active_listings = (
            db.query(func.count(Product.product_id))
            .filter(
                Product.merchant_id == merchant.merchant_id,
                Product.status == ProductStatus.active,
            )
            .scalar()
            or 0
        )

        return {"total_products": total_products, "active_listings": active_listings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/profile", response_model=dict)
async def update_merchant_profile(
    business_name: str | None = Form(None),
    business_category: str | None = Form(None),
    contact: str | None = Form(None),
    current_user: Users = Depends(get_current_merchant_user),
    db: Session = Depends(get_db),
):
    try:
        # Get merchant profile
        merchant = (
            db.query(Merchants)
            .filter(Merchants.user_id == current_user.user_id)
            .first()
        )
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant profile not found")

        # Update fields if provided
        if business_name is not None:
            merchant.business_name = business_name
        if business_category is not None:
            merchant.business_category = business_category
        if contact is not None:
            merchant.contact = contact

        # Update timestamp
        merchant.updated_at = datetime.now()

        db.commit()
        db.refresh(merchant)

        return {
            "merchant_id": merchant.merchant_id,
            "business_name": merchant.business_name,
            "business_category": merchant.business_category,
            "name": merchant.name,
            "email": merchant.email,
            "contact": merchant.contact,
            "created_at": merchant.created_at,
            "updated_at": merchant.updated_at,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e
