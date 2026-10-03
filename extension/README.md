# UPC NetShield - Extensión Universal de Control de Navegación

Extensión multiplataforma (Manifest V3) para control y restricción de navegación web instantánea en laboratorios de cómputo.
Compatible con **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, **Brave** y **Opera**.

---

## ⚡ ¿Por qué usar la Extensión?

* **Efecto 100% Inmediato (0 ms)**: Intercepta las solicitudes directamente en el motor de red del navegador con `declarativeNetRequest`.
* **Redirección de Pestañas Abiertas**: Si un alumno ya está viendo un video o navegando en un sitio prohibido al momento de aplicar la regla, la pestaña se redirige **inmediatamente** a la pantalla de bloqueo sin necesidad de cerrar o reiniciar el navegador.
* **Sincronización Continua**: Se comunica con el Dashboard Central (`http://10.142.240.190:5050`) cada 2 segundos reportando el estado y recibiendo las directivas.
* **Pantalla Institucional de Bloqueo**: Muestra un aviso profesional con el logo de la UPC, el nombre de la máquina y la justificación de la directiva.

---

## 🚀 Guía de Instalación Rápida

### 1. En Google Chrome, Microsoft Edge y Brave

1. Abre tu navegador y dirígete a la página de extensiones:
   * **Chrome**: `chrome://extensions`
   * **Edge**: `edge://extensions`
   * **Brave**: `brave://extensions`
2. Activa el interruptor **"Modo de desarrollador"** (Developer mode) en la esquina superior derecha.
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta `extension` de este proyecto.
5. ¡Listo! Verás el ícono de **UPC NetShield** en tu barra de extensiones.

### 2. En Mozilla Firefox

1. Abre Firefox y escribe en la barra de direcciones:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Haz clic en **"Cargar complemento temporal..."** (Load Temporary Add-on).
3. Selecciona el archivo `manifest.json` que está dentro de la carpeta `extension`.
4. La extensión se activará inmediatamente con el identificador `netshield-agent@upc.edu.pe`.

---

## ⚙️ Configuración de la Estación

Al hacer clic sobre el ícono de la extensión en la barra del navegador, se abrirá el panel de control rápido:

1. **Estación de trabajo (Hostname)**: Configura el identificador del equipo en el laboratorio (por ejemplo: `PC-VH101-01`). Haz clic en el botón 💾 para guardar.
2. **Servidor Central (Dashboard)**: Por defecto apunta a `http://10.142.240.190:5050`. Puedes cambiar la IP o puerto si es necesario.
3. **Estado de Conexión**:
   * 🟢 **En línea**: Conectado y recibiendo directivas en tiempo real.
   * 🔴 **Sin conexión**: El servidor no responde o la IP es incorrecta.
4. **Sincronizar ahora**: Fuerza una comprobación manual inmediata.

---

## 🏢 Despliegue Masivo en Laboratorios (Directivas GPO / Registro)

Para instalar la extensión en todas las computadoras de un laboratorio sin que los alumnos puedan deshabilitarla ni desinstalarla, se puede forzar mediante el Registro de Windows:

### Para Google Chrome:
```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist]
"1"="<ID_DE_EXTENSION>;https://clients2.google.com/service/update2/crx"
```

### Para Microsoft Edge:
```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist]
"1"="<ID_DE_EXTENSION>;https://edge.microsoft.com/extensionwebstorebase/v1/crx"
```
