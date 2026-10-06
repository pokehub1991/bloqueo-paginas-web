@echo off
setlocal
chcp 65001 >nul
title UPC NetShield - Bloqueo Empresarial (Modo LanSchool)

REM 1. Comprobacion segura de Administrador sin bucles
fltmc >nul 2>&1
if %errorlevel% neq 0 (
    if "%~1"=="--elevated" (
        echo [ERROR] No se pudieron obtener permisos de Administrador.
        echo Haz clic derecho sobre este archivo y elige 'Ejecutar como administrador'.
        pause
        exit /b 1
    )
    echo Solicitando permisos de Administrador...
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/k cd /d \"\"%~dp0\"\" && \"\"%~f0\"\" --elevated' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set "EXT_ID=eijeibflalbhaehajeiiopcemmlhopih"

echo ==============================================================
echo   UPC NETSHIELD - BLOQUEO EMPRESARIAL (MODO LANSCHOOL)
echo ==============================================================
echo.
echo ID Oficial: %EXT_ID%
echo.
echo Aplicando directiva 'ExtensionInstallForcelist'...

REM Google Chrome
reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
echo [+] Google Chrome configurado.

REM Microsoft Edge
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
echo [+] Microsoft Edge configurado.

REM Brave Browser
reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
echo [+] Brave Browser configurado.

echo.
echo [+] Cerrando navegadores para aplicar los cambios...
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM brave.exe >nul 2>&1

echo.
echo ==============================================================
echo   BLOQUEO APLICADO EXITOSAMENTE
echo ==============================================================
echo 1. Abre Google Chrome o Microsoft Edge.
echo 2. Ve a chrome://extensions.
echo 3. Veras a UPC NetShield con el icono de empresa 🏢,
echo    sin boton Remove y con el interruptor congelado,
echo    EXACTAMENTE IGUAL QUE LANSCHOOL.
echo ==============================================================
echo.
pause
