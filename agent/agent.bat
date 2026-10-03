@echo off
chcp 65001 >nul
title Agente de Restricciones Web - Conectando...

echo ==============================================================
echo  INICIANDO AGENTE DE BLOQUEO WEB (CLIENTE WINDOWS)
echo ==============================================================
echo.

:: Comprobar si se está ejecutando con permisos de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [Aviso] Se requieren permisos de Administrador para configurar
    echo las directivas de navegadores en este equipo.
    echo Solicitando elevacion de privilegios...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Verificar que exista agent.ps1
if not exist "agent.ps1" (
    echo [Error] No se encontro el archivo agent.ps1 en este directorio.
    echo Asegurate de descomprimir o copiar toda la carpeta 'agent'.
    pause
    exit /b
)

echo [OK] Permisos de Administrador concedidos.
echo [OK] Ejecutando script de sincronizacion con el servidor central...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [Aviso] El agente finalizo con codigo de salida: %errorlevel%
    pause
)
