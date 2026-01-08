@echo off
title 🧹 LIMPEZA TOTAL DE PROCESSOS
color 0C

echo ===================================================
echo    PARANDO TODOS OS SERVIDORES TRAVADOS
echo ===================================================
echo.

echo [1/3] Fechando Node.js...
taskkill /f /im node.exe >nul 2>&1

echo [2/3] Fechando processos antigos na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

echo [3/3] Fechando processos antigos na porta 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1

echo.
echo ===================================================
echo    PRONTO! AGORA PODE RODAR O "START_SAAS.BAT"
echo ===================================================
pause
