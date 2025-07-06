@echo off
echo Starting Vue Vben Admin Node.js Backend...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start the server
echo Starting server on port 3001...
npm run dev
