import logging

from api.database import SessionLocal
from api.models import Merchants, Product, Users

logger = logging.getLogger(__name__)


def check_products():
    db = SessionLocal()
    try:
        logger.info("\nChecking merchants...")
        merchants = db.query(Users).filter_by(role="merchant").all()
        if merchants:
            logger.info(f"Found {len(merchants)} merchants:")
            for merchant in merchants:
                logger.info(
                    f"- {merchant.full_name} (ID: {merchant.user_id}, Email: {merchant.email})"
                )

                # Get merchant profile
                profile = (
                    db.query(Merchants).filter_by(user_id=merchant.user_id).first()
                )
                if profile:
                    logger.info(f"  Business: {profile.business_name}")

                    # Get products for this merchant
                    products = (
                        db.query(Product)
                        .filter_by(merchant_id=profile.merchant_id)
                        .all()
                    )
                    if products:
                        logger.info(f"  Products ({len(products)}):")
                        for product in products:
                            logger.info(f"    - {product.name}")
                            logger.info(f"      Price: ${product.price}")
                            logger.info(f"      Stock: {product.stock}")
                            logger.info(f"      Image: {product.image_url}")
                    else:
                        logger.info("  No products found for this merchant")
                else:
                    logger.info("  No merchant profile found")
        else:
            logger.info("No merchants found in the database")

        logger.info("\nChecking all products...")
        products = db.query(Product).all()
        if products:
            logger.info(f"Found {len(products)} total products:")
            for product in products:
                logger.info(f"- {product.name}")
                logger.info(f"  ID: {product.product_id}")
                logger.info(f"  Merchant ID: {product.merchant_id}")
                logger.info(f"  Price: ${product.price}")
                logger.info(f"  Stock: {product.stock}")
                logger.info(f"  Image: {product.image_url}")
                logger.info(f"  Status: {product.status}")
        else:
            logger.info("No products found in the database")

    except Exception as e:
        logger.info(f"Error checking products: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_products()
