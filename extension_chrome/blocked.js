// Script de la página de bloqueo UPC NetShield

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const domainParam = urlParams.get('domain') || '';
  const reasonParam = urlParams.get('reason') || '';

  const domainChip = document.getElementById('domainChip');
  const domainText = document.getElementById('domainText');
  const reasonText = document.getElementById('reasonText');
  const hostnameText = document.getElementById('hostnameText');
  const policyText = document.getElementById('policyText');
  const timeText = document.getElementById('timeText');

  // Hora actual
  timeText.textContent = new Date().toLocaleTimeString();

  // Obtener datos guardados de la extensión
  try {
    const data = await chrome.storage.local.get(['hostname', 'policyMode', 'lastSyncTime']);
    if (data.hostname) {
      hostnameText.textContent = data.hostname;
    }

    if (data.policyMode === 'block_all') {
      policyText.textContent = 'Bloqueo Total (Todas las webs)';
      reasonText.textContent = 'El acceso a esta página web ha sido restringido por requerimientos del docente o área. Comunícate con el encargado del área o laboratorio.';
      domainChip.style.display = 'none';
    } else if (data.policyMode === 'allow_list') {
      policyText.textContent = 'Lista Autorizada Exclusiva';
      reasonText.textContent = 'El acceso a esta página web ha sido restringido por requerimientos del docente o área (no figura en la lista autorizada). Comunícate con el encargado del área.';
      if (domainParam) {
        domainText.textContent = domainParam;
      } else {
        domainChip.style.display = 'none';
      }
    } else {
      policyText.textContent = 'Lista Restringida';
      if (domainParam) {
        domainText.textContent = domainParam;
      } else {
        domainText.textContent = 'Sitio Restringido';
      }
      reasonText.textContent = 'El acceso a esta página web ha sido restringido por requerimientos del docente o área. Comunícate con el encargado del área o laboratorio para mayor información.';
    }
  } catch (err) {
    console.error('Error leyendo storage:', err);
  }

  // Botón Volver
  document.getElementById('btnBack').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://www.upc.edu.pe';
    }
  });

  // Botón Reintentar
  document.getElementById('btnRetry').addEventListener('click', async () => {
    const btn = document.getElementById('btnRetry');
    btn.textContent = 'Comprobando...';
    btn.disabled = true;

    try {
      // Solicitar sincronización inmediata al background
      await chrome.runtime.sendMessage({ action: 'syncNow' });
      setTimeout(() => {
        if (domainParam) {
          window.location.href = `https://${domainParam}`;
        } else {
          window.location.reload();
        }
      }, 1000);
    } catch {
      window.location.reload();
    }
  });
});
