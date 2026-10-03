@echo off
chcp 65001 >nul
title UPC NetShield - Servidor y Dashboard

cd /d "%~dp0"

if exist "%~dp0start.bat" (
    call "%~dp0start.bat"
) else if exist "%~dp0server\start.bat" (
    cd /d "%~dp0server"
    call start.bat
) else if exist "%~dp0dashboard\start.bat" (
    cd /d "%~dp0dashboard"
    call start.bat
) else (
    echo [ERROR] No se encontro start.bat en este directorio ni en subcarpetas.
    pause
)
