#!/bin/bash

echo "🚀 Setting up Sorta - AI-Powered Cloud Storage"
echo "=============================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   - Mac: brew install postgresql"
    echo "   - Linux: sudo apt-get install postgresql"
    echo "   - Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if database exists
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w sorta_db)

if [ -z "$DB_EXISTS" ]; then
    echo "📦 Creating database 'sorta_db'..."
    createdb -U postgres sorta_db
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database. Please create it manually:"
        echo "   createdb sorta_db"
        exit 1
    fi
else
    echo "✅ Database 'sorta_db' already exists"
fi

echo ""
echo "📋 Running database schema..."
psql -U postgres -d sorta_db -f server/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully"
else
    echo "⚠️  Schema might have failed. Check the output above."
fi

echo ""
echo "🔧 Checking environment file..."
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server/.env from .env.example..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env - Please update with your credentials if needed"
else
    echo "✅ server/.env exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "=============================================="
echo "✨ Setup Complete!"
echo "=============================================="
echo ""
echo "To start the application:"
echo "  npm run dev    (runs both frontend and backend)"
echo ""
echo "Or run separately:"
echo "  npm run server (backend on port 5000)"
echo "  npm start      (frontend on port 3000)"
echo ""
echo "Access the app at: http://localhost:3000"
echo ""
