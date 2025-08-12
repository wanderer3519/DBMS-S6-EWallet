import logging

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


# Get database URL from environment variables
DATABASE_URL = "sqlite:///test.db"
# Examples:
# DATABASE_URL=postgresql://username:password@localhost:5432/mydatabase
# DATABASE_URL=postgresql://postgres:yourpassword@db.yourprojectid.supabase.co:5432/postgres
# DATABASE_URL=mysql+pymysql://username:password@localhost:3306/mydatabase
# DATABASE_URL = os.getenv("DATABASE_URL")


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

session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    with session_local() as db:
        yield db
