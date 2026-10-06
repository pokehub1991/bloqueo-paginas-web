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

echo ==============================================================
echo   UPC NETSHIELD - BLOQUEO EMPRESARIAL (MODO LANSCHOOL)
echo ==============================================================
echo.
echo Este script configurara la directiva 'ExtensionInstallForcelist'
echo para que UPC NetShield quede IGUAL que LanSchool:
echo  - Icono de gestion corporativa (Edificio / Maletin)
echo  - Interruptor BLOQUEADO en gris (No se puede desactivar)
echo  - Boton 'Remove' ELIMINADO (No se puede desinstalar)
echo  - Instalacion automatica en todos los perfiles de usuario
echo ==============================================================
echo.

set /p EXT_ID="Ingresa el ID de 32 caracteres de UPC NetShield: "

if "%EXT_ID%"=="" (
    echo [ERROR] No ingresaste ningun ID.
    pause
    exit /b 1
)

:: Limpiar espacios en blanco si los hubiera
set "EXT_ID=%EXT_ID: =%"

echo.
echo [+] Aplicando directiva forzada con ID: %EXT_ID%
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
echo [+] Reiniciando procesos de navegadores...
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM brave.exe >nul 2>&1

echo.
echo ==============================================================
echo   INSTALACION Y BLOQUEO COMPLETADO CON EXITO
echo ==============================================================
echo Abre Google Chrome o Microsoft Edge y ve a chrome://extensions.
echo Veras que UPC NetShield ahora tiene el icono de empresa,
echo el interruptor esta congelado y el boton Remove ha desaparecido,
echo EXACTAMENTE IGUAL QUE LANSCHOOL.
echo ==============================================================
echo.
pause
