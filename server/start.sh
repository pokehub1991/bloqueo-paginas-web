#!/usr/bin/env bash
# ==============================================================
# Lanzador Unix / macOS para el Servidor Central de Bloqueo Web
# ==============================================================

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=============================================================="
echo "  INICIANDO SERVIDOR CENTRAL DE GESTION DE BLOQUEO WEB"
echo "=============================================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi

# Instalar dependencias backend si no existen
if [ ! -d "node_modules" ]; then
    echo "[1/3] Instalando dependencias del servidor..."
    npm install --silent
fi

# Verificar si el cliente está compilado
if [ ! -d "client/dist" ]; then
    echo "[2/3] Compilando panel de control web..."
    cd client
    if [ ! -d "node_modules" ]; then
        npm install --silent
    fi
    npm run build
    cd ..
fi

echo "[3/3] Iniciando servidor..."
node src/index.js
