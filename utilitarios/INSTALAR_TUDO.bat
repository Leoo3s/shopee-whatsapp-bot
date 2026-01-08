@echo off
title 🛠️ CORRECAO DE INSTALACAO
color 0E

echo ===================================================
echo    CORRIGINDO INSTALACAO DAS DEPENDENCIAS
echo ===================================================
echo.

echo [1/2] Instalando dependencias do Frontend (Pode demorar)...
cd ../frontend
call npm install
cd ..

echo [2/2] Instalando dependencias do Backend...
cd backend
call npm install
cd ..

echo.
echo ===================================================
echo    TUDO INSTALADO! AGORA TENTE O START_SAAS.BAT
echo ===================================================
pause
