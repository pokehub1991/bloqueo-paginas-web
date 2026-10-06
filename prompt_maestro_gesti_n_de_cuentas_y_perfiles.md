# SYSTEM PROMPT: MÓDULO DE SEGURIDAD DE CUENTAS, PERFILES E INCÓGNITO (DASHBOARD + EXTENSIÓN DE NAVEGADOR)

Actúa como un Principal Enterprise Web Systems Architect y Senior Browser Extension Engineer (Chromium / Firefox WebExtensions). Tu objetivo es diseñar e implementar la extensión modular para el sistema de control ya existente (Dashboard Dark Minimalist + Extensión de Navegador instalada en las estaciones de trabajo), integrando el subsistema de **Gestión de Identidades de Navegador, Restricción de Cuentas Google y Control de Sesiones de Usuario**.

Esta solución debe estar arquitecturada para operar a escala empresarial, soportando fluidamente catálogos de **más de 1,000 equipos en red local** sin degradación de rendimiento.

---

## 1. CONTEXTO Y PROBLEMÁTICA OPERATIVA

En laboratorios de cómputo, bibliotecas y aulas compartidas, estudiantes y docentes inician sesión con sus cuentas personales o institucionales de Google/Microsoft en Chrome, Edge u otros navegadores compatibles y olvidan cerrarlas al retirarse. Esto expone:

* Correos (Gmail), almacenamiento en la nube (Google Drive), contraseñas guardadas e historial personal.
* Riesgo crítico de suplantación de identidad y manipulación malintencionada de datos personales por parte del siguiente usuario.
* Uso de modo incógnito o apertura de sesiones secundarias para eludir la supervisión del aula.

---

## 2. MECANISMOS TÉCNICOS DE LA EXTENSIÓN (MANIFEST V3)

La extensión de navegador ya desplegada debe ser actualizada para interceptar, restringir y purgar sesiones de Google y perfiles sin requerir agentes externos a nivel de sistema operativo:

### A. Bloqueo de Inicio de Sesión en Google y Cuentas Web
1. **Interceptación de Endpoints de Autenticación (declarativeNetRequest):**
   * Bloqueo dinámico de rutas y endpoints OAuth/Login de Google:
     * `accounts.google.com/signin/*`
     * `accounts.google.com/ServiceLogin*`
     * `accounts.google.com/o/oauth2/*`
   * Redirección amigable a una pantalla interna de la extensión (`blocked_auth.html`):
     * *"El inicio de sesión con cuentas personales está deshabilitado en este equipo para proteger tu privacidad."*

2. **Control de Cabeceras HTTP de Dominios Permitidos (Header Injection):**
   * Inyección de la cabecera HTTP estándar de Google Workspace en peticiones hacia `*.google.com`:
     * Cabecera: `X-GoogApps-Allowed-Domains`
     * Valor: Permite restringir el acceso exclusivamente a dominios institucionales aprobados (ej. `instituto.edu.pe`) o bloquear cualquier cuenta externa/personal.

### B. Cierre de Sesión Forzado y Purga de Cookies / Credenciales
* **Uso de la API `chrome.cookies` y `chrome.browsingData`:**
  * Función de "Purga Inmediata": Elimina todas las cookies, tokens de sesión y almacenamiento local (`localStorage`, `indexedDB`) asociados a los dominios:
    * `google.com`, `accounts.google.com`, `youtube.com`, `live.com`, `login.microsoftonline.com`.
  * **Purga al Detectar Cierre o Inactividad:** Opción para ejecutar la limpieza automática de cookies de sesión cuando se cierran todas las ventanas del navegador o tras un periodo de inactividad configurable.

### C. Detección y Restricción de Modo Incógnito
* **Control mediante `chrome.extension.isAllowedIncognitoAccess` y Reglas Declarativas:**
  * La extensión detecta si se está ejecutando o si el usuario intenta abrir ventanas privadas.
  * Si el equipo tiene la política de "Modo Incógnito Bloqueado", la extensión intercepta la creación de pestañas bajo `tab.incognito === true` y las cierra inmediatamente o redirige la navegación a una ventana pública supervisada.

### D. Notificaciones al Usuario en Pantalla
* Notificación visual no intrusiva mediante Content Script o banner flotante cuando la extensión bloquea un intento de inicio de sesión no autorizado, indicando las razones de seguridad en lenguaje claro.

---

## 3. PRINCIPIOS DE COMUNICACIÓN EN LENGUAJE NATURAL

Toda la interfaz del dashboard debe evitar jerga técnica de APIs o extensiones, priorizando descripciones orientadas a la administración escolar o de laboratorio:

| Parámetro Técnico | Etiqueta en Dashboard | Texto Explicativo / Ejemplo Práctico |
| :--- | :--- | :--- |
| Bloqueo OAuth Google | **Impedir inicio de sesión en Google** | *"Evita que alumnos o docentes abran su correo personal de Gmail o Drive y lo dejen abierto."* |
| Inyección de cabecera de dominio | **Permitir solo correos institucionales** | *"Permite únicamente cuentas oficiales (ej. `@colegio.edu.pe`) y bloquea correos personales."* |
| `chrome.browsingData.remove` | **Cerrar sesiones activas ahora** | *"Cierra de golpe todos los correos y cuentas abiertas en los navegadores de estos equipos."* |
| Restricción de ventanas privadas | **Bloquear modo incógnito** | *"Impide que los alumnos abran ventanas privadas para ocultar su actividad."* |
| Purga programada por inactividad | **Limpiar cuentas al salir** | *"Borra contraseñas y cuentas temporales automáticamente cada vez que se cierra el navegador."* |

---

## 4. DISEÑO DE INTERFAZ Y ADAPTACIÓN AL DASHBOARD (IMPECCABLE DESIGN)

El nuevo módulo debe integrarse con perfecta coherencia al dashboard dark minimalista existente:

### Estética y Consistencia Visual:
* **Tema Dark Minimalista:** Tokens semánticos de Tailwind (Slate/Zinc: `bg-card`, `border-border/40`, `text-muted-foreground`, acentos en tonos neutros o índigo sutil).
* **Hero del Módulo:**
  * Título: *"Seguridad de Cuentas y Privacidad de Aulas"*
  * Resumen dinámico: *"1,050 computadoras conectadas"* | *"Políticas de protección activas"*.
  * Botón directo con tutorial interactivo: *"¿Cómo funciona la protección de cuentas?"*.

### Componentes de Control:
1. **Interruptores Rápidos Globales (Master Toggles):**
   * Tarjetas con bordes ultra-delgados para activar o pausar con 1 clic:
     * `[ Impedir cuentas personales de Google ]`
     * `[ Deshabilitar navegación en modo incógnito ]`
     * `[ Cerrar todas las cuentas al salir ]`
2. **Barra de Acciones por Lotes (Batch Action Bar):**
   * Aparece al seleccionar una o más computadoras en la lista:
     * `[ Cerrar sesiones ahora ]` `[ Bloquear logins ]` `[ Aplicar cambios ]`
3. **Indicadores de Estado en la Tabla:**
   * Iconos sutiles por equipo que indican el estado de la extensión:
     * Candado de cuentas cerrado (Logins bloqueados).
     * Máscara tachada (Incógnito restringido).
     * Punto verde de sincronización con la extensión (`En línea`).

---

## 5. ESCALABILIDAD PARA MÁS DE 1,000 EQUIPOS

El dashboard y la API deben procesar el tráfico de más de 1,000 extensiones de navegador conectadas simultáneamente sin saturar la red ni la base de datos:

### A. Base de Datos Optimizada (SQLite en Modo WAL)
* Índices B-Tree compuestos en `hostname`, `client_id`, `ip_address` y `last_seen_at`.
* Configuración obligatoria: `PRAGMA journal_mode = WAL;` y `PRAGMA synchronous = NORMAL;` para soportar cientos de lecturas/escrituras concurrentes sin bloqueo de archivo.

### Esquema Relacional de Políticas:
```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,      -- ID generado por la extensión
    hostname TEXT NOT NULL,              -- Nombre asignado o reportado
    ip_address TEXT NOT NULL,
    browser_type TEXT DEFAULT 'Chrome',  -- Chrome, Edge, Firefox, Brave
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'online'
);

CREATE TABLE identity_policies (
    device_id INTEGER PRIMARY KEY,
    block_google_login BOOLEAN DEFAULT 0,
    allowed_google_domains TEXT DEFAULT '', -- Dominios permitidos separados por coma
    block_incognito BOOLEAN DEFAULT 0,
    clear_session_on_close BOOLEAN DEFAULT 0,
    force_logout_trigger INTEGER DEFAULT 0, -- Incrementador para disparar cierre inmediato
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_devices_lookup ON devices(client_id, hostname);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);
```

### B. Comunicación Eficiente Extensión-Dashboard (Long Polling / ETag)
* Para evitar el problema de "thundering herd" (1,000 extensiones pidiendo datos al mismo segundo):
  * **Hash de Configuración (ETag):** La extensión envía su hash local de políticas cada 45–60 segundos con un *jitter* aleatorio de ±8 segundos.
  * Si el servidor detecta que las políticas no cambiaron para ese equipo, responde inmediatamente con código `304 Not Modified` o un JSON minimalista de menos de 80 bytes.
* **Comando de Cierre Inmediato (Emergency Flush):** Cuando el administrador pulsa "Cerrar sesiones ahora", la API incrementa `force_logout_trigger`; al detectarlo en su siguiente comprobación, la extensión ejecuta la purga de cookies al instante.

### C. Rendimiento en el Frontend
* **Virtualización de Tabla:** Implementar renderizado virtualizado (`@tanstack/react-virtual` o `react-window`) para mantener 60 FPS estables al desplegar las más de 1,000 filas.
* **Búsqueda y Filtrado Instantáneo:** Búsqueda rápida por nombre de equipo o dirección de red mediante debounce (300 ms).

---

## 6. ENTREGABLES ESPERADOS EN LA RESPUESTA

1. **Modificaciones para la Extensión (Manifest V3):**
   * Configuración de reglas `declarativeNetRequest` para el bloqueo de endpoints de Google Sign-in.
   * Background script / Service Worker que gestione el ciclo de sincronización ligera con el dashboard y la purga de cookies con `chrome.cookies` / `chrome.browsingData`.
2. **Actualización del Backend y Base de Datos:**
   * Esquema SQLite con modo WAL e índices optimizados.
   * Endpoints REST para sincronización por hash y comando de forzado de cierre de sesión.
3. **Componentes Frontend del Dashboard:**
   * Nueva pestaña o sección integrada de *"Seguridad de Cuentas y Privacidad"*.
   * Tabla virtualizada de alto rendimiento para +1,000 equipos con interruptores rápidos y acciones en lote explicadas en lenguaje natural.