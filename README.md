# Sistema Centralizado de Bloqueo Web (Dashboard + Agente Windows)

Solución integral cliente-servidor para el bloqueo y desbloqueo de URLs en estaciones de trabajo Windows a través de directivas de registro locales (Enterprise Policies), controlado mediante un dashboard web responsivo, moderno y en lenguaje natural para redes locales (LAN).

---

## 🌟 Características Principales

* **Control Centralizado en LAN:** Aplica o retira restricciones de navegación en tiempo real a computadoras individuales o a todo el grupo con un solo clic.
* **Lenguaje Cotidiano y Claro:** Cero tecnicismos confusos. Indicadores de "Última vez visto", "Nombre del equipo", "Reglas aplicadas" y sugerencias contextuales.
* **Onboarding Guiado:** Tour interactivo paso a paso para usuarios y administradores de sala.
* **Catálogo Rápido y Personalizable:** Botones de 1 clic para redes sociales, streaming y juegos, con capacidad completa para agregar y eliminar páginas favoritas.
* **Agente Windows Idempotente:** Sincroniza directivas en segundo plano para **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox** y **Opera / Opera GX** mediante políticas del sistema (`HKLM` / `HKCU`).
* **Sin Extensiones Requeridas:** No requiere instalar extensiones, certificados SSL ni plugins en los navegadores de los clientes.

---

## 📁 Estructura del Proyecto

```text
├── server/                  # Backend API + Frontend Dashboard + Script de arranque
│   ├── client/              # Frontend React + Vite + Tailwind CSS + Lucide
│   ├── src/                 # Backend Node.js + Express
│   ├── data/                # Base de datos persistente SQLite
│   ├── start.bat            # Lanzador automático para Windows
│   ├── start.sh             # Lanzador para macOS / Linux
│   └── package.json
└── agent/                   # Agente para computadoras Windows cliente
    ├── config.ini           # Configuración de IP/Puerto del servidor central
    ├── agent.bat            # Lanzador con elevación de permisos UAC
    └── agent.ps1            # Script PowerShell de sincronización e idempotencia
```

---

## 🚀 Puesta en Marcha

### 1. Iniciar el Servidor Central
En la computadora principal que servirá como panel de control:
* **En Windows:** Haz doble clic en `server/start.bat`.
* **En macOS / Linux:** Ejecuta `./server/start.sh` en la terminal.

El script instalará automáticamente las dependencias, compilará la interfaz y te mostrará la dirección de acceso local y en red:
```text
==============================================================
  CENTRO DE CONTROL DE BLOQUEO WEB - SERVIDOR CENTRAL ACTIVO  
==============================================================
  Acceso Local:    http://localhost:4000
  Acceso en Red:   http://192.168.1.X:4000
--------------------------------------------------------------
  Credenciales por defecto: admin / V1ll@uPc
==============================================================
```

### 2. Conectar las Computadoras Cliente (Windows)
1. Copia la carpeta `agent` a la computadora Windows que deseas gestionar.
2. Abre `agent/config.ini` con el Bloc de Notas y coloca la dirección del servidor central:
   ```ini
   [Servidor]
   ServerUrl = http://192.168.1.X:4000
   ```
3. Haz clic derecho en `agent/agent.bat` y selecciona **"Ejecutar como Administrador"**.
4. ¡Listo! La computadora aparecerá automáticamente en el panel web en menos de un minuto.

---

## 🔐 Credenciales de Acceso
* **Usuario:** `admin`
* **Contraseña:** `V1ll@uPc`
