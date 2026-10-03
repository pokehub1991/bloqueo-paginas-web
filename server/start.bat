@echo off
setlocal
chcp 65001 >nul
title UPC NetShield - Servidor y Dashboard

:: 1. Cambiar al directorio del script
cd /d "%~dp0"

echo ==============================================================
echo  INICIANDO SERVIDOR CENTRAL DE GESTION DE BLOQUEO WEB
echo ==============================================================
echo.

:: 2. Detectar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LocalAppData%\Programs\node\node.exe" (
        set "PATH=%LocalAppData%\Programs\node;%PATH%"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo.
    echo Para ejecutar el Servidor / Dashboard es indispensable tener Node.js.
    echo Por favor descarga e instala la version LTS recomendada desde:
    echo https://nodejs.org/
    echo.
    echo NOTA: Si acabas de instalar Node.js, debes cerrar la ventana negra
    echo y volver a abrirla para que Windows detecte Node.
    echo.
    pause
    exit /b 1
)

:: 3. Configuracion del puerto del Dashboard (por defecto 5050)
if "%PORT%"=="" set PORT=5050

:: 4. Instalar dependencias del backend si no existen
if not exist "node_modules" (
    echo [1/2] Instalando dependencias del servidor en Windows...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudieron instalar las dependencias de Node.js.
        echo Asegurate de tener conexion a internet.
        pause
        exit /b 1
    )
)

:: 5. Verificar si el frontend esta compilado
if not exist "client\dist" (
    if exist "client\src" (
        echo Compilando interfaz web...
        cd client
        if not exist "node_modules" call npm install --silent
        call npm run build
        cd ..
    ) else (
        echo [ERROR] No se encontro la carpeta client\dist con la interfaz compilada.
        pause
        exit /b 1
    )
)

echo [2/2] Iniciando el servicio en red local...
echo.

:: 6. Iniciar el servidor Node.js
node src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [Aviso] El servidor se ha detenido.
    pause
)
