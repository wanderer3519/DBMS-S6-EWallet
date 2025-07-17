import logging

from sqlalchemy import inspect

from api.database import Base, engine

logger = logging.getLogger(__name__)


def init_db():
    logger.info("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully!")
    except Exception as e:
        logger.info(f"Error creating tables: {e}")
        raise





def check_tables():
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        logger.info("\nExisting tables in database:")
        if existing_tables:
            for table in existing_tables:
                logger.info(f"- {table}")
        else:
            logger.info("No tables found.")
    except Exception as e:
        logger.info(f"Error checking tables: {e}")


if __name__ == "__main__":
    logger.info("Initializing database...")
    init_db()
    check_tables()
    logger.info("\nDatabase initialization complete!")
