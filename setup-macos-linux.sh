#!/bin/bash

# Stop on first error
set -e

# Get the absolute path of the script's directory
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT="$SCRIPT_DIR"

echo "Starting project setup in $PROJECT_ROOT..."

# --- Prerequisite Check ---
echo "Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed. Please install it to continue."
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null
then
    echo "Error: npm is not installed. Please install it to continue."
    exit 1
fi

echo "Prerequisites met."

# --- Dependency Installation ---
echo "Installing root dependencies..."
cd "$PROJECT_ROOT"
npm install

echo "Root dependencies installed."

# --- Backend Setup ---
echo "Setting up backend (nsc-events-nestjs)..."
cd "$PROJECT_ROOT/nsc-events-nestjs"

if [ -f ".env.sample" ]; then
    cp .env.sample .env
    echo "Created .env file from .env.sample"
    echo "ACTION REQUIRED: Please configure your backend .env file with your database credentials and JWT secret."
else
    echo "Warning: nsc-events-nestjs/.env.sample not found. Skipping .env creation."
fi

# --- Frontend Setup ---
echo "Setting up frontend (nsc-events-nextjs)..."
cd "$PROJECT_ROOT/nsc-events-nextjs"

if [ -f ".env.sample" ]; then
    cp .env.sample .env.local
    echo "Created .env.local file from .env.sample"
    echo "ACTION REQUIRED: Please configure your frontend .env.local file if needed."
else
    echo "Warning: nsc-events-nextjs/.env.sample not found. Skipping .env.local creation."
fi

cd "$PROJECT_ROOT"

echo "Setup complete!"
echo "To start the development servers, run: npm run dev"
