@echo off
title 🚑 REPARO DE EMERGENCIA - FRONTEND
color 0E

echo ===================================================
echo    CORRIGINDO ERRO DE CSS/TAILWIND/POSTCSS
echo ===================================================
echo.

cd ../frontend

echo [1/3] Removendo pasta node_modules corrompida...
rmdir /s /q node_modules
del package-lock.json

echo [2/3] Limpando cache do NPM...
call npm cache clean --force

echo [3/3] Reinstalando tudo do ZERO (Isso resolve)...
call npm install

echo.
echo ===================================================
echo    PRONTO! O ERRO "at-rule" DEVE TER SUMIDO.
echo ===================================================
echo    Agora rode o "START_SAAS.bat" novamente.
pause
