@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title UPC NetShield - Instalador Chromium (Chrome / Edge / Brave / Opera)

REM 1. Verificacion y elevacion segura a Administrador
fltmc >nul 2>&1
if %errorlevel% neq 0 (
    if "%~1"=="--elevated" (
        echo [ERROR] No se pudieron obtener privilegios de Administrador.
        pause
        exit /b 1
    )
    echo Solicitando elevacion de privilegios...
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/k cd /d \"\"%~dp0\"\" && \"\"%~f0\"\" --elevated' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"

set "CHROME_STORE_ID=eijeibflalbhaehajeiiopcemmlhopih"

echo ==============================================================
echo   UPC NETSHIELD - INSTALACION Y BLOQUEO EN CHROMIUM
echo   (Google Chrome, Microsoft Edge, Brave, Opera)
echo ==============================================================
echo.
echo Directorio local: "%EXT_DIR%"
echo ID Store Oficial: "%CHROME_STORE_ID%"
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
    :: Politica empresarial forzada (Modo LanSchool: icono de empresa, switch bloqueado, sin boton quitar)
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%CHROME_STORE_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "1" /t REG_SZ /d "chrome://extensions*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "2" /t REG_SZ /d "chrome://settings/reset*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "3" /t REG_SZ /d "chrome://settings/cleanup*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "4" /t REG_SZ /d "chrome://flags*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\URLBlocklist" /v "5" /t REG_SZ /d "chrome://settings/clearBrowserData*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallSources" /v "1" /t REG_SZ /d "<all_urls>" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Google Chrome protegido: Extension forzada y bloqueada (Modo LanSchool).
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
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%CHROME_STORE_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "InPrivateModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "1" /t REG_SZ /d "edge://extensions*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "2" /t REG_SZ /d "edge://settings/reset*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "3" /t REG_SZ /d "edge://flags*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist" /v "4" /t REG_SZ /d "edge://settings/clearBrowserData*" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallSources" /v "1" /t REG_SZ /d "<all_urls>" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Microsoft Edge protegido: Extension forzada y bloqueada (Modo LanSchool).
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
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist" /v "1" /t REG_SZ /d "%CHROME_STORE_ID%;https://clients2.google.com/service/update2/crx" /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /t REG_DWORD /d 1 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "DeveloperToolsAvailability" /t REG_DWORD /d 2 /f >nul 2>&1
    reg add "HKLM\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist" /v "1" /t REG_SZ /d "brave://extensions*" /f >nul 2>&1
    set /a DETECTED_BROWSERS+=1
    echo     Brave Browser protegido: Extension forzada y bloqueada (Modo LanSchool).
) else (
    echo [-] Brave Browser no detectado.
)

:: -------------------------------------------------------------
:: 5. PARCHEO DE ACCESOS DIRECTOS (OPCIONAL/RESPALDO)
:: -------------------------------------------------------------
echo.
echo [+] Asegurando soporte adicional en accesos directos...
if exist "%EXT_DIR%\patch_shortcuts.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%EXT_DIR%\patch_shortcuts.ps1" -ExtensionDir "%EXT_DIR%"
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
echo  1. UPC NetShield forzada via directiva corporativa (ExtensionInstallForcelist)
echo  2. Icono de empresa asignado 🏢 e interruptor congelado
echo  3. Boton 'Remove' completamente eliminado (inamovible)
echo  4. Modo Incognito / InPrivate: INHABILITADO
echo  5. Herramientas F12 (Consola): DESACTIVADAS
echo.
echo Para retirar estas restricciones en el futuro, ejecuta:
echo 'desinstalar_extensiones.bat'
echo ==============================================================
echo.
pause
