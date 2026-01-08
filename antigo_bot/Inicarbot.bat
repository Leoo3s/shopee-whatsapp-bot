@echo off
title 🚀 SISTEMA DE ACHADINHOS - MODO VS CODE
mode con: cols=100 lines=30
cls
color 0B

echo ======================================================================
echo                SISTEMA AUTOMATICO DE ACHADINHOS
echo ======================================================================
echo    Data: %date%  -  Hora: %time%
echo    Status: MONITORANDO SCRIPTS NO VS CODE
echo ======================================================================
echo.

:: 1. VERIFICAÇÃO DE DIRETÓRIO (Previne o fechamento súbito)
set "CAMINHO=C:\Users\souz4\Desktop\whatsapp-bot"
if not exist "%CAMINHO%" (
    color 0C
    echo [ERRO] A pasta do projeto nao foi encontrada em:
    echo "%CAMINHO%"
    echo.
    echo Verifique se o nome do usuario ou o caminho estao corretos.
    pause
    exit
)

:: 2. LIMPEZA DE PORTA (3000)
echo  [1/3] 🔍 Verificando processos antigos na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  [OK] Porta 3000 verificada/liberada.
echo.

:: 3. ENTRAR NA PASTA
cd /d "%CAMINHO%"

:: 4. INICIALIZAÇÃO DO SERVIDOR (index.js)
echo  [2/3] 📱 Iniciando Servidor de WhatsApp (index.js)...
start "DASHBOARD - WHATSAPP" cmd /k "color 0A && node index.js"
echo.

:: 5. AGUARDAR CONEXÃO
echo  [!] AGUARDANDO CONEXAO (20 Segundos)...
timeout /t 20 /nobreak >nul
echo.

:: 6. INICIALIZAÇÃO DO BUSCADOR (shopee_bot.js)
echo  [3/3] 🛒 Iniciando Buscador Shopee (shopee_bot.js)...
start "MINERADOR - SHOPEE" cmd /k "color 0E && node shopee_bot.js"
echo.

echo ======================================================================
echo  ✅ SISTEMA ATIVO!
echo ======================================================================
echo  Janela Verde: WhatsApp | Janela Amarela: Shopee
echo.
pause