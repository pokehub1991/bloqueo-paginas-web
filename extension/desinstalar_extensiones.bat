@echo off
setlocal
chcp 65001 >nul
title UPC NetShield - Desinstalador y Desbloqueador de Navegadores

:: 1. Verificación y elevación automática a Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ==============================================================
    echo  [AVISO] Se requieren permisos de Administrador para remover
    echo  las directivas de proteccion en los navegadores.
    echo ==============================================================
    echo Solicitando elevacion de privilegios...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"

echo ==============================================================
echo   UPC NETSHIELD - DESINSTALACION Y RESTAURACION DE NAVEGADORES
echo ==============================================================
echo.

:: -------------------------------------------------------------
:: 2. REMOVER DIRECTIVAS EN GOOGLE CHROME
:: -------------------------------------------------------------
echo [+] Restaurando politicas de Google Chrome...
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "DeveloperToolsAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "ExtensionInstallSources" /f >nul 2>&1

:: -------------------------------------------------------------
:: 3. REMOVER DIRECTIVAS EN MICROSOFT EDGE
:: -------------------------------------------------------------
echo [+] Restaurando politicas de Microsoft Edge...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "InPrivateModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "DeveloperToolsAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "ExtensionInstallSources" /f >nul 2>&1

:: -------------------------------------------------------------
:: 4. REMOVER DIRECTIVAS EN BRAVE BROWSER
:: -------------------------------------------------------------
echo [+] Restaurando politicas de Brave Browser...
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "DeveloperToolsAvailability" /f >nul 2>&1

:: -------------------------------------------------------------
:: 5. REMOVER DIRECTIVAS EN MOZILLA FIREFOX
:: -------------------------------------------------------------
echo [+] Removiendo directivas corporativas en Mozilla Firefox...
if exist "%ProgramFiles%\Mozilla Firefox\distribution\policies.json" (
    del /f /q "%ProgramFiles%\Mozilla Firefox\distribution\policies.json" >nul 2>&1
)
if exist "%ProgramFiles(x86)%\Mozilla Firefox\distribution\policies.json" (
    del /f /q "%ProgramFiles(x86)%\Mozilla Firefox\distribution\policies.json" >nul 2>&1
)

:: -------------------------------------------------------------
:: 6. LIMPIAR ACCESOS DIRECTOS DE CHROMIUM
:: -------------------------------------------------------------
echo.
echo [+] Limpiando argumentos en accesos directos de todos los usuarios...
if exist "%EXT_DIR%\unpatch_shortcuts.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%EXT_DIR%\unpatch_shortcuts.ps1"
) else (
    echo [AVISO] unpatch_shortcuts.ps1 no encontrado.
)

:: -------------------------------------------------------------
:: 7. REINICIO DE NAVEGADORES
:: -------------------------------------------------------------
echo.
echo [+] Cerrando procesos de navegadores para restablecer el estado original...
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM brave.exe >nul 2>&1

echo.
echo ==============================================================
echo   RESTAURACION COMPLETADA EXITOSAMENTE
echo ==============================================================
echo  - Se elimino la politica forzada de la extension (ExtensionInstallForcelist).
echo  - Se restablecio el acceso libre a chrome://extensions y edge://extensions.
echo  - Se reactivo el modo Incognito / InPrivate.
echo  - Se reactivaron las herramientas de desarrollo (F12).
echo  - Se eliminaron las politicas forzadas en Firefox.
echo  - Se restauraron los accesos directos de los navegadores.
echo ==============================================================
echo.
pause
