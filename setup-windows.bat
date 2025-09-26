@echo off
setlocal

echo Starting project setup for Windows...

REM --- Prerequisite Check ---
echo Checking prerequisites...

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install it to continue.
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install it to continue.
    exit /b 1
)

echo Prerequisites met.

REM --- Dependency Installation ---
echo Installing root dependencies...
call npm install
echo Root dependencies installed.

REM --- Backend Setup ---
echo Setting up backend (nsc-events-nestjs)...
cd nsc-events-nestjs
if exist ".env.sample" (
    copy .env.sample .env >nul
    echo Created .env file from .env.sample
    echo ACTION REQUIRED: Please configure your backend .env file with your database credentials and JWT secret.
) else (
    echo Warning: nsc-events-nestjs\.env.sample not found. Skipping .env creation.
)
cd ..

REM --- Frontend Setup ---
echo Setting up frontend (nsc-events-nextjs)...
cd nsc-events-nextjs
if exist ".env.sample" (
    copy .env.sample .env.local >nul
    echo Created .env.local file from .env.sample
    echo ACTION REQUIRED: Please configure your frontend .env.local file if needed.
) else (
    echo Warning: nsc-events-nextjs\.env.sample not found. Skipping .env.local creation.
)
cd ..

echo.
echo Setup complete!
echo To start the development servers, run: npm run dev

endlocal
