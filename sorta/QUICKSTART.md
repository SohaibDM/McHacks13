# Sorta - Quick Start Guide

## Running the Application

### Option 1: Run Everything Together (Recommended)
```bash
npm run dev
```
This will start both the frontend (port 3000) and backend (port 5000) simultaneously.

### Option 2: Run Separately

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm start
```

## First Time Setup

1. **Install PostgreSQL**
   - Download from https://www.postgresql.org/download/
   - Or use `brew install postgresql` (Mac) / `apt-get install postgresql` (Linux)

2. **Create Database**
```bash
# Start PostgreSQL service (if not running)
# Windows: Use PostgreSQL service in Services
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
createdb sorta_db

# Or using psql
psql -U postgres
CREATE DATABASE sorta_db;
\q
```

3. **Run Database Schema**
```bash
psql -d sorta_db -f server/schema.sql
```
Or manually:
```bash
psql -U postgres -d sorta_db
# Then copy and paste contents of server/schema.sql
```

4. **Configure Environment**
   - Update `server/.env` with your PostgreSQL credentials
   - Default credentials are in the file (postgres/postgres)

5. **Start the Application**
```bash
npm run dev
```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Default Test Account

You can create a test account by registering at http://localhost:3000/register

## Troubleshooting

### Database Connection Issues
- Check if PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Verify credentials in `server/.env`
- Check if database exists: `psql -U postgres -l`

### Port Already in Use
- Frontend (3000): Change in package.json or set `PORT=3001`
- Backend (5000): Change in `server/.env`

### Module Not Found
```bash
npm install
```

### TypeScript Errors
```bash
npm install -D typescript @types/node
```

## Features to Test

1. **Register/Login**: Create an account and log in
2. **Theme Toggle**: Click sun/moon icon in header
3. **File Tree**: Explore the mock folder structure
4. **File Preview**: Click on files to see details
5. **AI Badges**: Look for "AI" badges on auto-sorted files
6. **AI Activity**: Watch for AI activity notifications (bottom-right)
7. **Upload Modal**: Click upload button (UI only, S3 not connected yet)

## Next Development Steps

See SORTA_README.md for full documentation and next steps.
