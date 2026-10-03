@echo off
chcp 65001 >nul
title Servidor Central - Bloqueador Web Empresarial

echo ==============================================================
echo  INICIANDO SERVIDOR CENTRAL DE GESTION DE BLOQUEO WEB
echo ==============================================================
echo.

:: 1. Comprobar que Node.js esté instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js (version LTS) desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Cambiar al directorio del servidor
cd /d "%~dp0"

:: 2. Instalar dependencias del backend si no existen
if not exist "node_modules\" (
    echo [1/3] Instalando dependencias del servidor...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudieron instalar las dependencias del servidor.
        pause
        exit /b
    )
)

:: 3. Verificar si el frontend esta compilado
if not exist "client\dist\" (
    echo [2/3] Preparando y compilando el panel de control web...
    cd client
    if not exist "node_modules\" (
        echo Instalando dependencias de la interfaz...
        call npm install --silent
    )
    echo Construyendo aplicacion web optimizada...
    call npm run build
    cd ..
)

echo [3/3] Iniciando el servicio en red local...
echo.

:: 4. Iniciar el servidor Node.js
node src/index.js

if %errorlevel% neq 0 (
    echo.
    echo [Aviso] El servidor se ha detenido.
    pause
)
