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
echo "Installing dependencies for all workspace..."
cd "$PROJECT_ROOT"
npm install

echo "All workspace dependencies installed."

# --- Backend Setup ---
echo "Setting up backend (nsc-events-nestjs)..."
cd "$PROJECT_ROOT/nsc-events-nestjs"

if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "ACTION REQUIRED: Please configure your backend .env file with your database credentials and other secrets."
else
    echo "Warning: nsc-events-nestjs/.env.example not found. Please create .env file manually."
fi

# --- Frontend Setup ---
echo "Setting up frontend (nsc-events-nextjs)..."
cd "$PROJECT_ROOT/nsc-events-nextjs"

if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "ACTION REQUIRED: Please configure your frontend .env file if needed."
else
    echo "Warning: nsc-events-nextjs/.env.example not found. Please create .env file manually."
fi

cd "$PROJECT_ROOT"

# --- Husky Git Hooks Setup ---
echo "Setting up Git hooks (Husky)..."
if [ -d ".git" ]; then
    cp .husky/pre-commit .git/hooks/pre-commit 2>/dev/null || echo "Warning: pre-commit hook not found"
    cp .husky/pre-push .git/hooks/pre-push 2>/dev/null || echo "Warning: pre-push hook not found"
    chmod +x .git/hooks/pre-commit .git/hooks/pre-push 2>/dev/null
    echo "Git hooks configured."
else
    echo "Warning: Not in a Git repository. Skipping Git hooks setup."
fi

echo "Setup complete!"
echo "To start the development servers, run: npm run dev"
