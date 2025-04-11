from database import engine, SessionLocal
from models import Product, Merchants, Users
from sqlalchemy.orm import Session

def check_products():
    db = SessionLocal()
    try:
        print("\nChecking merchants...")
        merchants = db.query(Users).filter_by(role='merchant').all()
        if merchants:
            print(f"Found {len(merchants)} merchants:")
            for merchant in merchants:
                print(f"- {merchant.full_name} (ID: {merchant.user_id}, Email: {merchant.email})")
                
                # Get merchant profile
                profile = db.query(Merchants).filter_by(user_id=merchant.user_id).first()
                if profile:
                    print(f"  Business: {profile.business_name}")
                    
                    # Get products for this merchant
                    products = db.query(Product).filter_by(merchant_id=profile.merchant_id).all()
                    if products:
                        print(f"  Products ({len(products)}):")
                        for product in products:
                            print(f"    - {product.name}")
                            print(f"      Price: ${product.price}")
                            print(f"      Stock: {product.stock}")
                            print(f"      Image: {product.image_url}")
                    else:
                        print("  No products found for this merchant")
                else:
                    print("  No merchant profile found")
        else:
            print("No merchants found in the database")
            
        print("\nChecking all products...")
        products = db.query(Product).all()
        if products:
            print(f"Found {len(products)} total products:")
            for product in products:
                print(f"- {product.name}")
                print(f"  ID: {product.product_id}")
                print(f"  Merchant ID: {product.merchant_id}")
                print(f"  Price: ${product.price}")
                print(f"  Stock: {product.stock}")
                print(f"  Image: {product.image_url}")
                print(f"  Status: {product.status}")
        else:
            print("No products found in the database")
            
    except Exception as e:
        print(f"Error checking products: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_products() 