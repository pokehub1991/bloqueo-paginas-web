@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title UPC NetShield - Instalacion Forzada con Politica Empresarial (Modo LanSchool)

:: Elevacion a Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Se requieren permisos de Administrador para configurar la politica empresarial.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set "EXT_ID=eijeibflalbhaehajeiiopcemmlhopih"

echo ==============================================================
echo   UPC NETSHIELD - BLOQUEO EMPRESARIAL (MODO LANSCHOOL)
echo ==============================================================
echo.
echo ID Oficial de UPC NetShield: %EXT_ID%
echo.
echo Aplicando directiva 'ExtensionInstallForcelist' en:
echo  - Google Chrome
echo  - Microsoft Edge
echo  - Brave Browser
echo.

:: 1. Google Chrome
echo [+] Configurando Google Chrome...
reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1

:: 2. Microsoft Edge
echo [+] Configurando Microsoft Edge...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1

:: 3. Brave Browser
echo [+] Configurando Brave Browser...
reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%EXT_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1

echo.
echo [+] Reiniciando procesos de navegadores para cargar la directiva...
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM brave.exe >nul 2>&1

echo.
echo ==============================================================
echo   INSTALACION Y BLOQUEO COMPLETADO CON EXITO
echo ==============================================================
echo 1. Abre Google Chrome o Microsoft Edge.
echo 2. Dirigete a chrome://extensions o edge://extensions.
echo 3. Veras que UPC NetShield ahora tiene el icono de empresa 🏢,
echo    el interruptor esta BLOQUEADO y el boton Remove HA DESAPARECIDO,
echo    EXACTAMENTE IGUAL QUE LANSCHOOL.
echo ==============================================================
echo.
pause
