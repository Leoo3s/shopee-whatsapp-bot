@echo off
title 🚀 SAAS LAUNCHER - SHOPEE BOT
color 0B

echo ===================================================
echo    INICIANDO PLATAFORMA SAAS COMPLETA
echo ===================================================
echo.

:: 1. Iniciar Backend
echo [1/2] Iniciando Backend API (Porta 3001)...
start "BACKEND API" /d "backend" cmd /k "npm start || node server.js"

:: 2. Iniciar Frontend
echo [2/2] Iniciando Dashboard Frontend...
start "FRONTEND DASHBOARD" /d "frontend" cmd /k "npm run dev"

echo.
echo Tudo iniciado! Acesse: http://localhost:5173
echo.
pause
