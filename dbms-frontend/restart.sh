#!/bin/bash

echo "Stopping any running React processes..."
pkill -f "react-scripts start" || true

echo "Clearing npm cache..."
npm cache clean --force

echo "Removing node_modules/.cache directory..."
rm -rf node_modules/.cache

echo "Starting React application..."
npm start 