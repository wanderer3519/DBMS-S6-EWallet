#!/bin/bash

# run_sql_api.sh - Script to run the SQL implementation of the API

echo "Starting E-Wallet & Merchant API (SQL Implementation)..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found. Please install PostgreSQL first."
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "Python not found. Please install Python first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "pip not found. Please install pip first."
    exit 1
fi

# Ensure required Python packages are installed
echo "Installing required Python packages..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file with default settings..."
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ewallet_db" > .env
    echo "SECRET_KEY=your-secret-key-change-this-in-production" >> .env
    echo ".env file created. Please edit it with your database credentials."
fi

# Check if ewallet_db database exists
echo "Checking if database exists..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw ewallet_db; then
    echo "Database 'ewallet_db' not found. Running initialization script..."
    psql -U postgres -f init_db.sql
else
    echo "Database 'ewallet_db' already exists."
fi

# Start the API server
echo "Starting API server..."
python main_sql.py 