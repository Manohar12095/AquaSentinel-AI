@echo off
echo Starting AquaSentinel AI...

echo Seeding Database (this will reset the data to the Tamil Nadu dataset)...
start /wait "Seeding Database" cmd /c "cd backend && .\venv\Scripts\python.exe seed.py"

echo Starting Backend Server...
start "AquaSentinel Backend" cmd /c "cd backend && .\venv\Scripts\python.exe run.py"

echo Starting Frontend Server...
start "AquaSentinel Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Both servers are starting up!
echo The backend API will be available at http://localhost:8000
echo The frontend UI will be available at http://localhost:5173
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key to exit this launcher...
pause >nul
