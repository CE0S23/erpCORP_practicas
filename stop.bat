@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  ERP CORP - Deteniendo servicios
echo ============================================

echo [1/3] Deteniendo stack Docker Compose...
docker compose down >nul 2>&1

echo [2/3] Deteniendo Redis local (si existe)...
docker stop erp-redis >nul 2>&1

echo [3/3] Liberando puertos locales (3000-3003)...
for %%P in (3000 3001 3002 3003) do (
  for /f "tokens=5" %%i in ('netstat -aon ^| findstr ":%%P " ^| findstr "LISTENING" 2^>nul') do (
    if not "%%i"=="0" (
      taskkill /F /PID %%i >nul 2>&1
      echo      Puerto %%P liberado (PID %%i).
    )
  )
)

echo.
echo Servicios detenidos.
echo ============================================
endlocal
