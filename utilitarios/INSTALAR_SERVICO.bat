@echo off
title ⚙️ INSTALADOR DE SERVIÇO WINDOWS (PM2)
color 0B

echo ===================================================
echo    INSTALANDO BOT COMO SERVICO DO WINDOWS
echo ===================================================
echo.

echo [1/4] Instalando PM2 Globalmente...
call npm install -g pm2 pm2-windows-startup

echo [2/4] Instalando Gerenciador de Inicializacao...
call pm2-startup install

echo [3/4] Registrando Backend...
cd ../backend
call pm2 start server.js --name "shopee-saas-backend"
cd ..

echo [4/4] Registrando Frontend...
cd frontend
call pm2 start npm --name "shopee-saas-frontend" -- run dev
cd ..

echo [5/5] Salvando lista de servicos...
call pm2 save

echo.
echo ===================================================
echo    PRONTO! O SISTEMA RODARÁ EM SEGUNDO PLANO.
echo    Mesmo se voce reiniciar o PC, ele volta sozinho.
echo.
echo    Para monitorar, abra o terminal e digite: pm2 monit
echo ===================================================
pause
