@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set MODE=%~1
if "%MODE%"=="" set MODE=docker

echo ============================================
echo  ERP CORP - Iniciando servicios [%MODE%]
echo ============================================

if /I "%MODE%"=="docker" goto :docker
if /I "%MODE%"=="local" goto :local

echo Modo invalido: %MODE%
echo Usa: start.bat [docker^|local]
exit /b 1

:docker
echo [1/2] Iniciando backend con Docker Compose...
docker compose up -d --build
if errorlevel 1 (
  echo Error al iniciar Docker Compose.
  exit /b 1
)

echo [2/2] Iniciando frontend Angular (4200)...
start "Frontend :4200" cmd /k "cd /d "%ROOT%" && ng serve"
goto :wait_frontend

:local
echo [0/6] Liberando puertos ocupados...
for %%P in (3000 3001 3002 3003) do (
  for /f "tokens=5" %%i in ('netstat -aon ^| findstr ":%%P " ^| findstr "LISTENING" 2^>nul') do (
    if not "%%i"=="0" (
      taskkill /F /PID %%i >nul 2>&1
      echo      Puerto %%P liberado (PID %%i).
    )
  )
)
timeout /t 1 /nobreak >nul

echo [1/6] Iniciando Redis (Docker)...
docker run -d --name erp-redis -p 6379:6379 redis:alpine >nul 2>&1
if errorlevel 1 (
  docker start erp-redis >nul 2>&1
  echo      Redis ya existia, reanudado.
) else (
  echo      Redis iniciado.
)

echo [2/6] Iniciando User Service (3001)...
start "User Service :3001" cmd /k "cd /d "%ROOT%user-service" && npx prisma generate && npm run dev"

echo [3/6] Iniciando API Gateway (3000)...
start "API Gateway :3000" cmd /k "cd /d "%ROOT%api-gateway" && npm run dev"

echo [4/6] Iniciando Groups Service (3002)...
start "Groups Service :3002" cmd /k "cd /d "%ROOT%groups-service" && npm run dev"

echo [5/6] Iniciando Tickets Service (3003)...
start "Tickets Service :3003" cmd /k "cd /d "%ROOT%tickets-service" && npm run dev"

echo [6/6] Iniciando frontend Angular (4200)...
start "Frontend :4200" cmd /k "cd /d "%ROOT%" && ng serve"
goto :wait_frontend

:wait_frontend
echo.
echo Esperando que frontend responda en http://localhost:4200 ...
powershell -Command "& { $url='http://localhost:4200'; $timeout=120; $elapsed=0; do { Start-Sleep 3; $elapsed += 3; try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; Write-Host 'Frontend listo. Abriendo navegador...'; Start-Process $url; exit 0 } catch { Write-Host ('  ' + $elapsed + 's...') } } while ($elapsed -lt $timeout); Write-Host 'Timeout: abre manualmente http://localhost:4200' }"

echo.
echo ============================================
echo Inicio completado.
echo ============================================
endlocal
