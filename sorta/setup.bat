@echo off
echo ================================
echo Sorta - Setup for Windows
echo ================================
echo.

echo Checking PostgreSQL...
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL not found. Please install it first.
    echo Download from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)
echo PostgreSQL found!
echo.

echo Creating database if not exists...
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'sorta_db'" | findstr /C:"1" >nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating database sorta_db...
    createdb -U postgres sorta_db
) else (
    echo Database sorta_db already exists
)
echo.

echo Running database schema...
psql -U postgres -d sorta_db -f server\schema.sql
echo.

echo Checking environment file...
if not exist "server\.env" (
    echo Creating server\.env from .env.example...
    copy server\.env.example server\.env
    echo Created! Please update with your credentials if needed.
) else (
    echo server\.env exists
)
echo.

echo Installing dependencies...
call npm install
echo.

echo ================================
echo Setup Complete!
echo ================================
echo.
echo To start the application:
echo   npm run dev    (runs both frontend and backend)
echo.
echo Or run separately:
echo   npm run server (backend on port 5000)
echo   npm start      (frontend on port 3000)
echo.
echo Access at: http://localhost:3000
echo.
pause
