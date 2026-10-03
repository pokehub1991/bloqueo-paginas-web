# Política de Privacidad / Privacy Policy
**UPC NetShield - Extensión de Control de Navegación**  
*Última actualización: 3 de Octubre de 2026 / Last Updated: October 3, 2026*

---

## 🇪🇸 Versión en Español

### 1. Información General
**UPC NetShield** es una extensión de navegador desarrollada exclusivamente para la gestión, seguridad y supervisión de políticas de navegación web en estaciones de trabajo y laboratorios de cómputo educativos.

Esta política describe de manera transparente cómo la extensión gestiona la información y garantiza que la privacidad de los usuarios esté protegida en todo momento.

### 2. Datos Procesados por la Extensión
La extensión opera de manera autónoma y local. Los únicos datos técnicos necesarios para su funcionamiento son:
- **Identificador de la estación de trabajo (Hostname):** Nombre asignado a la computadora dentro del laboratorio (por ejemplo: `PC-LAB-01`).
- **Configuración de conexión local:** Dirección IP o URL del servidor central local del laboratorio (por ejemplo: `http://10.142.240.190:5050`) para consultar las directivas de navegación asignadas.
- **Reglas de navegación:** Listas de URLs permitidas o restringidas configuradas por los docentes o administradores del laboratorio.

### 3. Declaración de No Recopilación de Datos Personales
UPC NetShield **NO recopila, no procesa, no transmite ni almacena datos personales de ningún tipo**, incluyendo de forma enunciativa pero no limitativa:
- No recopila nombres, direcciones de correo electrónico, números de teléfono ni datos de cuentas personales.
- No recopila contraseñas, credenciales de inicio de sesión ni información financiera o de pago.
- No almacena ni rastrea el historial privado de navegación de los alumnos ni registra las pulsaciones de teclado (keystrokes).
- No recopila datos de ubicación geográfica ni información de salud.

### 4. Uso de los Permisos del Navegador
Cada permiso solicitado en el manifiesto tiene un propósito técnico específico y exclusivo:
- `declarativeNetRequest`: Permite aplicar de forma instantánea y local las directivas de filtrado de URLs (bloqueo o redirección a la pantalla institucional de aviso).
- `storage`: Permite guardar de manera local y aislada en el navegador (`chrome.storage.local`) el identificador del equipo y el estado de la conexión.
- `alarms`: Permite programar comprobaciones periódicas hacia el servidor local del laboratorio para actualizar las directivas en tiempo real.
- `tabs` y `webNavigation`: Permite detectar si una pestaña abierta ingresa a un sitio restringido para redirigirla hacia la pantalla institucional de aviso `blocked.html`.
- `host_permissions` (`http://*/*`, `https://*/*`): Requerido por el motor de filtrado para evaluar las solicitudes de red contra las directivas activas del laboratorio.

### 5. No Comercialización ni Cesión a Terceros
- La extensión **no comercializa, no vende, no transfiere ni cede** ninguna información a terceros o intermediarios publicitarios.
- La extensión no contiene publicidad, herramientas de rastreo (trackers), librerías de analítica ni código de terceros para telemetría externa.
- Toda la comunicación se efectúa únicamente entre la extensión y el servidor local de gestión de la institución.

### 6. Cumplimiento con las Directivas de Google Chrome Web Store
UPC NetShield cumple con la Política del Programa para Desarrolladores de Google Chrome Web Store, en particular con los requisitos de Propósito Único, Mínimo Privilegio de Datos y Manejo Seguro de la Información.

### 7. Contacto
Para consultas, inquietudes o aclaraciones técnicas respecto a esta política de privacidad, puede contactar al equipo de administración a través del repositorio oficial del proyecto:  
[https://github.com/pokehub1991/bloqueo-paginas-web](https://github.com/pokehub1991/bloqueo-paginas-web)

---

## 🇺🇸 English Version

### 1. Overview
**UPC NetShield** is a browser extension developed exclusively for web browsing management, security, and policy enforcement on workstations in educational computer labs.

This privacy policy explains how UPC NetShield handles information and protects user privacy.

### 2. Information Handled by the Extension
The extension operates locally. The only technical data processed for its core functionality consists of:
- **Workstation Identifier (Hostname):** The name assigned to the workstation within the computer lab (e.g., `PC-LAB-01`).
- **Local Management Server URL:** The internal IP address or hostname of the lab management server (e.g., `http://10.142.240.190:5050`) used to retrieve policy directives.
- **Filtering Rules:** Lists of blocked or allowed domain patterns assigned by faculty or lab administrators.

### 3. Non-Collection of Personal Data
UPC NetShield **does NOT collect, track, transmit, or sell personal data of any kind**:
- No personally identifiable information (PII) such as names, personal email addresses, phone numbers, or user account credentials.
- No passwords, financial information, or payment data.
- No personal browsing history tracking, search profiling, or keystroke logging.
- No geolocation data or biometric information.

### 4. Browser Permissions Justification
All requested permissions are strictly required for laboratory management:
- `declarativeNetRequest`: To enforce immediate network-level URL blocking/redirect rules as specified by lab policy.
- `storage`: To store workstation configuration and active rules locally via `chrome.storage.local`.
- `alarms`: To periodically query the local management server for updated rules.
- `tabs` & `webNavigation`: To detect and redirect already opened restricted tabs to the local notification page (`blocked.html`).
- `host_permissions` (`http://*/*`, `https://*/*`): Required by the declarative filtering engine to inspect network requests against active institutional policies.

### 5. Third-Party Sharing and Tracking
- We do not sell, rent, license, or disclose any user data to third parties.
- The extension contains zero third-party advertising, analytics scripts, trackers, or external telemetry libraries.
- Network communications occur solely between the client browser and the local institution server.

### 6. Compliance with Google Chrome Web Store Policies
UPC NetShield complies fully with the Google Chrome Web Store Developer Program Policies, adhering strictly to the Single Purpose, Minimal Data, and Limited Use requirements.

### 7. Contact
For questions or inquiries regarding this Privacy Policy, please visit our official repository:  
[https://github.com/pokehub1991/bloqueo-paginas-web](https://github.com/pokehub1991/bloqueo-paginas-web)
