#!/bin/bash

# Navigate to the frontend directory
cd "$(dirname "$0")"

# Remove existing node_modules and package-lock.json
echo "Cleaning up existing installation..."
rm -rf node_modules package-lock.json

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the development server
echo "Starting the development server..."
npm start 