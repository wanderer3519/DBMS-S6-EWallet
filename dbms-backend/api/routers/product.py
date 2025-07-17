import base64
import logging
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.auth_lib import get_current_user
from api.database import get_db
from api.models import Merchants, Product, ProductStatus, Users
from api.schemas import ProductCreate, ProductResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/product", tags=["Product"])


@router.post("", response_model=ProductResponse)
def create_product(
    product: ProductCreate, merchant_id: int, db: Session = Depends(get_db)
):
    try:
        # Validate merchant exists
        merchant = db.query(Merchants).filter(Merchants.user_id == merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant not found")

        # Validate business category
        if not product.business_category:
            raise HTTPException(status_code=400, detail="Business category is required")

        # Create product object
        db_product = Product(
            name=product.name,
            description=product.description,
            price=product.price,
            mrp=product.mrp,
            stock=product.stock,
            business_category=product.business_category,
            merchant_id=merchant_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # Save product
        db.add(db_product)
        db.commit()
        db.refresh(db_product)

        # Handle image upload if provided
        if product.image_url:
            try:
                image_data = base64.b64decode(product.image_url.split(",")[1])
                image_path = f"uploads/{db_product.product_id}.jpg"
                with open(image_path, "wb") as f:
                    f.write(image_data)
                db_product.image_url = f"/uploads/{db_product.product_id}.jpg"
                db.commit()
            except Exception as e:
                # Log the error but don't fail the product creation
                logger.info(f"Error saving image: {str(e)}")

        return db_product
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("", response_model=list[ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(Product).offset(skip).limit(limit).all()
    return products


@router.get("/merchant/{merchant_id}", response_model=list[ProductResponse])
def get_merchant_products(merchant_id: int, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.merchant_id == merchant_id).all()
    return products


@router.post("/upload-image")
def upload_product_image(
    file: UploadFile = File(...), current_user: Users = Depends(get_current_user)
):
    if current_user.role != "merchant":
        raise HTTPException(
            status_code=403,
            detail="Only merchants can upload product images",
        )

    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = (
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.id}.{file_extension}"
    )
    file_path = os.path.join("uploads", filename)

    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return the URL for the uploaded image
    return {"url": f"/uploads/{filename}"}


@router.get("/featured", response_model=list[ProductResponse])
def get_featured_products(db: Session = Depends(get_db)):
    try:
        # Get products with discount (where price < mrp)
        featured_products = (
            db.query(Product)
            .filter(
                Product.price < Product.mrp,
                Product.status == ProductStatus.active,
                Product.stock > 0,
            )
            .order_by(Product.mrp - Product.price)
            .limit(10)
            .all()
        )
        if featured_products:
            return featured_products
        else:
            # If no featured products found, return some sample products
            # This is temporary for frontend testing
            sample_products = [
                {
                    "product_id": 1,
                    "name": "Smartphone X",
                    "description": "Latest smartphone with amazing features",
                    "price": 799.99,
                    "mrp": 999.99,
                    "stock": 10,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active,
                },
                {
                    "product_id": 2,
                    "name": "Wireless Earbuds",
                    "description": "High quality sound with noise cancellation",
                    "price": 129.99,
                    "mrp": 149.99,
                    "stock": 15,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active,
                },
                {
                    "product_id": 3,
                    "name": "Smart Watch",
                    "description": "Track your fitness and stay connected",
                    "price": 249.99,
                    "mrp": 299.99,
                    "stock": 5,
                    "image_url": "https://via.placeholder.com/300",
                    "status": ProductStatus.active,
                },
            ]
            return sample_products
    except Exception as e:
        logger.info(f"Error fetching featured products: {e}")
        # Return sample products for frontend testing
        sample_products = [
            {
                "product_id": 1,
                "name": "Smartphone X",
                "description": "Latest smartphone with amazing features",
                "price": 799.99,
                "mrp": 999.99,
                "stock": 10,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active,
            },
            {
                "product_id": 2,
                "name": "Wireless Earbuds",
                "description": "High quality sound with noise cancellation",
                "price": 129.99,
                "mrp": 149.99,
                "stock": 15,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active,
            },
            {
                "product_id": 3,
                "name": "Smart Watch",
                "description": "Track your fitness and stay connected",
                "price": 249.99,
                "mrp": 299.99,
                "stock": 5,
                "image_url": "https://via.placeholder.com/300",
                "status": ProductStatus.active,
            },
        ]
        return sample_products


@router.get("/category/{category}", response_model=list[ProductResponse])
def get_products_by_category(category: str, db: Session = Depends(get_db)):
    try:
        products = (
            db.query(Product)
            .filter(
                Product.business_category == category,
                Product.status == ProductStatus.active,
            )
            .all()
        )
        return products
    except Exception as e:
        logger.info(f"Error fetching products by category: {e}")
        raise HTTPException(status_code=500, detail="Error fetching products") from e


@router.get("/categories", response_model=list[str])
def get_categories(db: Session = Depends(get_db)):
    try:
        categories = db.query(Product.business_category).distinct().all()
        return [category[0] for category in categories if category[0]]
    except Exception as e:
        logger.info(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Error fetching categories") from e


# Public product endpoints
@router.get("", response_model=list[ProductResponse])
def get_all_products(db: Session = Depends(get_db)):
    try:
        products = (
            db.query(Product).filter(Product.status == ProductStatus.active).all()
        )
        return products
    except Exception as e:
        logger.info(f"Error fetching products: {e}")
        raise HTTPException(status_code=500, detail="Error fetching products") from e


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id, Product.status == ProductStatus.active
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
