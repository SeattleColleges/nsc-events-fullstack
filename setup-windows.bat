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
if exist ".env.example" (
    copy .env.example .env >nul
    echo Created .env file from .env.example
    echo ACTION REQUIRED: Please configure your backend .env file with your database credentials and other secrets.
) else (
    echo Warning: nsc-events-nestjs\.env.example not found. Please create .env file manually.
)
echo Installing backend dependencies...
call npm install
cd ..

REM --- Frontend Setup ---
echo Setting up frontend (nsc-events-nextjs)...
cd nsc-events-nextjs
if exist ".env.example" (
    copy .env.example .env >nul
    echo Created .env file from .env.example
    echo ACTION REQUIRED: Please configure your frontend .env file if needed.
) else (
    echo Warning: nsc-events-nextjs\.env.example not found. Please create .env file manually.
)
echo Installing frontend dependencies...
call npm install
cd ..

REM --- Husky Git Hooks Setup ---
echo Setting up Git hooks (Husky)...
if exist ".git" (
    REM Try CMD copy first
    copy /Y ".husky\pre-commit" ".git\hooks\pre-commit" >nul 2>nul
    if %errorlevel% neq 0 (
        REM If CMD copy failed, try PowerShell method
        powershell -Command "if (Test-Path '.husky\pre-commit') { Copy-Item '.husky\pre-commit' '.git\hooks\pre-commit' -Force }" 2>nul
    )
    
    copy /Y ".husky\pre-push" ".git\hooks\pre-push" >nul 2>nul
    if %errorlevel% neq 0 (
        REM If CMD copy failed, try PowerShell method
        powershell -Command "if (Test-Path '.husky\pre-push') { Copy-Item '.husky\pre-push' '.git\hooks\pre-push' -Force }" 2>nul
    )
    
    REM Verify hooks were installed
    if exist ".git\hooks\pre-commit" (
        echo Git hooks configured successfully.
    ) else (
        echo Warning: Could not install Git hooks. Please check file permissions.
    )
) else (
    echo Warning: Not in a Git repository. Skipping Git hooks setup.
)

echo.
echo Setup complete!
echo To start the development servers, run: npm run dev

endlocal
