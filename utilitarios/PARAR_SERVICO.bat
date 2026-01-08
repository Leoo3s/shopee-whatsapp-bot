@echo off
title 🛑 PARAR SERVICO DO SAAS (PM2)
color 0C

echo ===================================================
echo    PARANDO E REMOVENDO O SERVICO DO SISTEMA
echo ===================================================
echo.

echo [1/3] Parando processos do Bot...
call pm2 stop all

echo [2/3] Removendo da lista de processos...
call pm2 delete all

echo [3/3] Desligando o gerenciador PM2...
call pm2 kill

echo.
echo ===================================================
echo    SERVICOS DESLIGADOS COM SUCESSO!
echo    O site nao abrira mais automaticamente.
echo ===================================================
pause
