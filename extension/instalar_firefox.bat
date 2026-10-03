@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title UPC NetShield - Instalador Forzado para Mozilla Firefox

:: 1. Verificación y elevación automática a Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ==============================================================
    echo  [AVISO] Se requieren permisos de Administrador para instalar
    echo  la extension forzada en Mozilla Firefox.
    echo ==============================================================
    echo Solicitando elevacion de privilegios...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"

:: Convertir barras invertidas a barras normales para la URL file:///
set "EXT_DIR_FWD=%EXT_DIR:\=/%"
set "XPI_FILE=%EXT_DIR%\netshield.xpi"
set "XPI_URL=file:///%EXT_DIR_FWD%/netshield.xpi"

echo ==============================================================
echo   UPC NETSHIELD - INSTALACION FORZADA EN MOZILLA FIREFOX
echo ==============================================================
echo.

:: 2. Verificar o generar el paquete .xpi
if not exist "%XPI_FILE%" (
    echo [+] Empaquetando netshield.xpi para Firefox...
    powershell -Command "Compress-Archive -Path '%EXT_DIR%\manifest.json', '%EXT_DIR%\background.js', '%EXT_DIR%\popup.html', '%EXT_DIR%\popup.js', '%EXT_DIR%\popup.css', '%EXT_DIR%\blocked.html', '%EXT_DIR%\blocked.js', '%EXT_DIR%\blocked.css', '%EXT_DIR%\icons' -DestinationPath '%EXT_DIR%\netshield.zip' -Force; Move-Item -Path '%EXT_DIR%\netshield.zip' -Destination '%XPI_FILE%' -Force" >nul 2>&1
)

if not exist "%XPI_FILE%" (
    echo [ERROR] No se pudo localizar ni compilar netshield.xpi.
    pause
    exit /b 1
)

echo [OK] Paquete de extension listo: %XPI_FILE%
echo.

set FIREFOX_INSTALLED=0

:: 3. Deteccion de Firefox
set "FX_PATHS[0]=%ProgramFiles%\Mozilla Firefox"
set "FX_PATHS[1]=%ProgramFiles(x86)%\Mozilla Firefox"

for /L %%i in (0,1,1) do (
    set "CURRENT_DIR=!FX_PATHS[%%i]!"
    if exist "!CURRENT_DIR!\firefox.exe" (
        echo [+] Configurando directiva forzada en: !CURRENT_DIR!...
        if not exist "!CURRENT_DIR!\distribution" mkdir "!CURRENT_DIR!\distribution"
        (
            echo {
            echo   "policies": {
            echo     "BlockAboutAddons": true,
            echo     "DisablePrivateBrowsing": true,
            echo     "ExtensionSettings": {
            echo       "netshield-agent@upc.edu.pe": {
            echo         "installation_mode": "force_installed",
            echo         "install_url": "!XPI_URL!"
            echo       }
            echo     }
            echo   }
            echo }
        ) > "!CURRENT_DIR!\distribution\policies.json"
        set FIREFOX_INSTALLED=1
        echo     Directiva corporativa aplicada en "!CURRENT_DIR!\distribution\policies.json".
    )
)

:: Comprobar Registro si no se encontro en carpetas estándar
if %FIREFOX_INSTALLED%==0 (
    for /f "tokens=2* delims=	 " %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe" /ve 2^>nul') do (
        set "FX_EXE=%%~B"
        for %%F in ("!FX_EXE!") do set "CURRENT_DIR=%%~dpF"
        if exist "!CURRENT_DIR!\firefox.exe" (
            echo [+] Detectado Firefox via registro en: !CURRENT_DIR!...
            if not exist "!CURRENT_DIR!\distribution" mkdir "!CURRENT_DIR!\distribution"
            (
                echo {
                echo   "policies": {
                echo     "BlockAboutAddons": true,
                echo     "DisablePrivateBrowsing": true,
                echo     "ExtensionSettings": {
                echo       "netshield-agent@upc.edu.pe": {
                echo         "installation_mode": "force_installed",
                echo         "install_url": "!XPI_URL!"
                echo       }
                echo     }
                echo   }
                echo }
            ) > "!CURRENT_DIR!\distribution\policies.json"
            set FIREFOX_INSTALLED=1
        )
    )
)

taskkill /F /IM firefox.exe >nul 2>&1

if %FIREFOX_INSTALLED%==0 (
    echo.
    echo [-] No se detecto ninguna instalacion de Mozilla Firefox en el equipo.
    echo.
) else (
    echo.
    echo ==============================================================
    echo   DIRECTIVA CORPORATIVA APLICADA EN MOZILLA FIREFOX
    echo ==============================================================
    echo  1. Se genero 'distribution\policies.json' con force_installed.
    echo  2. about:addons y la navegacion privada quedan bloqueados.
    echo.
    echo  [NOTA IMPORTANTE SOBRE FIREFOX REGULAR]
    echo  Mozilla Firefox estandar exige que todo archivo .xpi este firmado
    echo  digitalmente por Mozilla (addons.mozilla.org).
    echo  Si usas Firefox estandar y no carga automaticamente:
    echo    - Metodo Desarrollador: Abre Firefox, ve a about:debugging,
    echo      haz clic en 'Este Firefox' y carga 'manifest.json'.
    echo    - Metodo Empresa (Recomendado): Usa 'Firefox ESR' (version
    echo      para colegios y laboratorios) o sube tu .xpi a AMO de forma
    echo      gratuita y privada (Unlisted) para obtener la firma oficial.
    echo ==============================================================
)

echo.
pause
