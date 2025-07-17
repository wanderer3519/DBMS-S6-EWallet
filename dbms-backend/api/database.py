import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


# Get database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db.tumthedhpsrcwdqjgpzi.supabase.co:5432/postgres")


# Create SQLAlchemy engine with connection testing
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection testing
    pool_recycle=3600,  # Recycle connections after 1 hour
)

# Test database connection
try:
    engine.connect()
    logger.info("Database connection successful!")
except Exception as e:
    logger.info(f"Database connection failed: {e}")
    raise

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
