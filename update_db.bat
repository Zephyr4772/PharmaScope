@echo off
REM ============================================================
REM  PharmaSynapse - update_db.bat
REM  One command: Scrape - Build - Promote - Done
REM
REM  Usage:
REM    update_db.bat           - full pipeline (scrape + build + promote)
REM    update_db.bat --no-scrape - skip scraping, just rebuild
REM ============================================================

setlocal EnableDelayedExpansion

set "PROJECT_ROOT=%~dp0"
set "HIGHWAY=%PROJECT_ROOT%highway"
set "LOG_FILE=%PROJECT_ROOT%data\last_update.log"

echo.
echo ============================================================
echo   PharmaSynapse Database Update Pipeline
echo   %DATE% %TIME%
echo ============================================================
echo.

REM Check Python is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.9+ and add to PATH.
    exit /b 1
)

REM Extract salts BEFORE scraping
echo [STEP 0/4] Extracting unique salts...
python "%HIGHWAY%\extract_salts.py"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Salt extraction failed.
    exit /b 1
)

REM STEP 1: Scrape official sources
if "%1"=="--no-scrape" (
    echo [STEP 1/4] Skipping scrape
) else (
    echo [STEP 1/4] Scraping official data sources...
    echo.

    echo   Running OpenFDA scraper...
    python "%HIGHWAY%\scrapers\openfda_scraper.py"
    if %ERRORLEVEL% NEQ 0 (
        echo   [WARN] OpenFDA scraper encountered errors. Continuing with cached data.
    ) else (
        echo   [OK] OpenFDA scrape complete.
    )

    echo   Running India govt scraper...
    python "%HIGHWAY%\scrapers\india_scraper.py"
    if %ERRORLEVEL% NEQ 0 (
        echo   [WARN] India scraper encountered errors. Continuing with cached data.
    ) else (
        echo   [OK] India scrape complete.
    )
)

echo.

REM STEP 2: Run ETL Builder
echo [STEP 2/4] Running Highway ETL Builder...
echo.

python "%HIGHWAY%\builder.py" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Builder failed. Database NOT updated. Check output above.
    exit /b 1
)

echo.

REM STEP 3: Promote latest build
echo [STEP 3/4] Promoting latest build to live...
echo.

python "%HIGHWAY%\promote.py" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Promotion failed. Check build output.
    exit /b 1
)

echo.

REM STEP 4: Cleanup Old Builds
echo [STEP 4/4] Cleaning up old builds...
echo.

python "%HIGHWAY%\cleanup_builds.py" 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARN] Cleanup failed. Continuing anyway since this is non-critical.
)

echo.
echo ============================================================
echo   Database update complete.
echo   Restart the Node.js server to load the new database.
echo   Run start.bat to do this automatically.
echo ============================================================
echo.

echo Last update: %DATE% %TIME% >> "%LOG_FILE%"

endlocal
