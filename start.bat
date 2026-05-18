@echo off
title PharmaLens - Starting...
color 0A

echo.
echo  ==========================================
echo   PHARMALENS - Deployment Launcher
echo  ==========================================
echo.

:: ─── Step 1: Start Ollama ─────────────────────────────────────────────────
echo [1/5] Starting Ollama AI service...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    start "Ollama" ollama serve
    echo       Ollama started.
) else (
    echo       Ollama already running, skipping.
)
timeout /t 3 /nobreak >nul

:: ─── Step 2: Kill any stale ngrok ─────────────────────────────────────────
echo [2/5] Cleaning up old ngrok instances...
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo       Done.

:: ─── Step 3: Start the API server FIRST ───────────────────────────────────
echo [3/5] Starting PharmaLens API server (port 3000)...
start "PharmaLens API Server" cmd /k "title PharmaLens API Server && cd /d "%~dp0API" && node server.js"

echo       Waiting for API to load data (this takes ~15s for large JSON)...
:WAIT_API
timeout /t 5 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:3000/api/search/stats -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo       API not ready yet, retrying...
    goto WAIT_API
)
echo       API is UP and ready!

:: ─── Step 4: Start ngrok tunnel ───────────────────────────────────────────
echo [4/5] Starting ngrok tunnel (port 3000)...
start "ngrok" ngrok http 3000 --log=stdout
echo       Waiting for ngrok to initialize...
timeout /t 5 /nobreak >nul

:: Get ngrok public URL
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Invoke-RestMethod http://localhost:4040/api/tunnels).tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1 -ExpandProperty public_url"') do set NGROK_URL=%%i

if "%NGROK_URL%"=="" (
    echo.
    echo   [ERROR] Could not get ngrok URL. Is ngrok installed and in PATH?
    echo   Install ngrok from https://ngrok.com/download
    echo   Then run: ngrok config add-authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

echo       Got URL: %NGROK_URL%

:: ─── Step 5: Rebuild frontend (no env injection needed — uses relative URLs) ──
echo [5/5] Rebuilding frontend...
:: Clear any old VITE_API_BASE_URL that might have been set previously
echo # Relative URLs used — no VITE_API_BASE_URL needed> "pharmasynapse-ui\pharmasynapse-ui\.env"

cd pharmasynapse-ui\pharmasynapse-ui
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ERROR] Frontend build failed! Check the errors above.
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo       Frontend rebuilt successfully. Refresh the browser to apply.

:: ─── Done ─────────────────────────────────────────────────────────────────
cls
color 0A
echo.
echo  ==========================================
echo   PHARMALENS IS LIVE!
echo  ==========================================
echo.
echo   Local:   http://localhost:3000
echo   Public:  %NGROK_URL%
echo.
echo   Share the PUBLIC URL with anyone to access
echo   the app from any device or browser.
echo.
echo   AI endpoint: %NGROK_URL%/api/ai/status
echo   API docs:    %NGROK_URL%/api/search?drug=paracetamol
echo.
echo  ==========================================
echo   Keep this window open while the app runs.
echo   BOTH "PharmaLens API Server" and "ngrok"
echo   windows must stay open.
echo  ==========================================
echo.
pause
