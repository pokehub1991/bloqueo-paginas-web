@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title UPC NetShield - Instalador Chromium (Chrome / Edge / Brave / Opera)

:: 1. Verificación y elevación automática a Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ==============================================================
    echo  [AVISO] Se requieren permisos de Administrador para configurar
    echo  las directivas de seguridad en navegadores Chromium.
    echo ==============================================================
    echo Solicitando elevacion de privilegios...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"

echo ==============================================================
echo   UPC NETSHIELD - INSTALACION Y BLOQUEO EN CHROMIUM
echo   (Google Chrome, Microsoft Edge, Brave, Opera)
echo ==============================================================
echo.
echo Directorio de extension: "%EXT_DIR%"
echo.

set DETECTED_BROWSERS=0

:: -------------------------------------------------------------
:: 2. DETECCION Y CONFIGURACION DE GOOGLE CHROME
:: -------------------------------------------------------------
set CHROME_FOUND=0
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1

if %CHROME_FOUND%==0 (
    reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" >nul 2>&1
    if !errorlevel! equ 0 set CHROME_FOUND=1
)
if %CHROME_FOUND%==0 (
    reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" >nul 2>&1
    if !errorlevel! equ 0 set CHROME_FOUND=1
)
if %CHROME_FOUND%==0 (
    for /d %%U in ("C:\Users\*") do (
        if exist "%%U\AppData\Local\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
    )
)

if %CHROME_FOUND%==1 (
    echo [+] Configurando directivas de seguridad para Google Chrome...
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "1" /t REG_SZ /d "chrome://extensions*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "2" /t REG_SZ /d "chrome://settings/reset*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "3" /t REG_SZ /d "chrome://settings/cleanup*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "4" /t REG_SZ /d "chrome://flags*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "5" /t REG_SZ /d "chrome://settings/clearBrowserData*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallSources" /v "1" /t REG_SZ /d "<all_urls>" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Google Chrome protegido: Gestion de extensiones bloqueada.
) else (
    echo [-] Google Chrome no detectado en este equipo.
)

:: -------------------------------------------------------------
:: 3. DETECCION Y CONFIGURACION DE MICROSOFT EDGE
:: -------------------------------------------------------------
set EDGE_FOUND=0
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set EDGE_FOUND=1
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set EDGE_FOUND=1
if %EDGE_FOUND%==0 (
    reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" >nul 2>&1
    if !errorlevel! equ 0 set EDGE_FOUND=1
)

if %EDGE_FOUND%==1 (
    echo [+] Configurando directivas de seguridad para Microsoft Edge...
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "InPrivateModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "1" /t REG_SZ /d "edge://extensions*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "2" /t REG_SZ /d "edge://settings/reset*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "3" /t REG_SZ /d "edge://flags*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "4" /t REG_SZ /d "edge://settings/clearBrowserData*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallSources" /v "1" /t REG_SZ /d "<all_urls>" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Microsoft Edge protegido: Gestion de extensiones bloqueada.
) else (
    echo [-] Microsoft Edge no detectado en este equipo.
)

:: -------------------------------------------------------------
:: 4. DETECCION Y CONFIGURACION DE BRAVE BROWSER
:: -------------------------------------------------------------
set BRAVE_FOUND=0
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" set BRAVE_FOUND=1
if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" set BRAVE_FOUND=1
if %BRAVE_FOUND%==0 (
    for /d %%U in ("C:\Users\*") do (
        if exist "%%U\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" set BRAVE_FOUND=1
    )
)

if %BRAVE_FOUND%==1 (
    echo [+] Configurando directivas de seguridad para Brave Browser...
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist" /v "1" /t REG_SZ /d "brave://extensions*" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Brave Browser protegido: Gestion de extensiones bloqueada.
) else (
    echo [-] Brave Browser no detectado.
)

:: -------------------------------------------------------------
:: 5. PARCHEO DE ACCESOS DIRECTOS (DESKTOP, INICIO Y BARRA DE TAREAS)
:: -------------------------------------------------------------
echo.
echo [+] Asegurando carga automatica de la extension en todos los accesos directos...
if exist "%EXT_DIR%\patch_shortcuts.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%EXT_DIR%\patch_shortcuts.ps1" -ExtensionDir "%EXT_DIR%"
) else (
    echo [ERROR] No se encontro patch_shortcuts.ps1 en el directorio.
)

:: -------------------------------------------------------------
:: 6. REINICIO DE NAVEGADORES PARA ACTIVAR NUEVAS POLITICAS
:: -------------------------------------------------------------
echo.
echo [+] Reiniciando procesos en segundo plano de navegadores...
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM brave.exe >nul 2>&1

echo.
echo ==============================================================
echo   INSTALACION Y BLOQUEO EN CHROMIUM FINALIZADO CON EXITO
echo ==============================================================
echo  1. chrome://extensions y edge://extensions: BLOQUEADOS
echo     (Ningun usuario puede acceder a desactivarla ni desinstalarla)
echo  2. Modo Incognito / InPrivate: INHABILITADO
echo     (No se puede evadir el bloqueo mediante navegacion privada)
echo  3. Herramientas F12 (Consola): DESACTIVADAS
echo     (Proteccion contra manipulacion de codigo)
echo  4. Accesos directos actualizados para arrancar con UPC NetShield.
echo.
echo Para retirar estas restricciones en el futuro, ejecuta:
echo 'desinstalar_extensiones.bat'
echo ==============================================================
echo.
pause
