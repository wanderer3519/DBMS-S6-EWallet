# E-Wallet DBMS Project

This project is an E-Wallet system built with FastAPI and PostgreSQL. It includes features for user authentication, wallet management, and product listings.

## Features

- User authentication (signup, login)
- Wallet management (balance, transactions)
- Product catalog with images
- Merchant functionality
- Secure API endpoints

## Prerequisites

- Python 3.8+
- PostgreSQL
- pip (Python package manager)

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd dbms-project
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the project root with the following variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/ewallet
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. Initialize the database:
```bash
python init_db.py
```

6. Populate with sample data:
```bash
python populate_sample_data.py
python download_sample_images.py
```

7. Start the server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
dbms-project/
├── main.py              # FastAPI application
├── database.py          # Database configuration
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── auth.py              # Authentication utilities
├── crud.py              # Database operations
├── init_db.py           # Database initialization
├── populate_sample_data.py  # Sample data population
├── download_sample_images.py # Sample image download
├── requirements.txt     # Project dependencies
├── .env                 # Environment variables
└── uploads/            # Uploaded files directory
    └── products/       # Product images
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Secure file upload handling
- Input validation with Pydantic
- Environment variable configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 