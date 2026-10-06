document.addEventListener('DOMContentLoaded', async () => {
  const hostnameText = document.getElementById('hostnameText');
  const allowedDomainBox = document.getElementById('allowedDomainBox');
  const allowedDomainText = document.getElementById('allowedDomainText');
  const btnUnderstood = document.getElementById('btnUnderstood');
  const btnBack = document.getElementById('btnBack');

  // Leer estado local de la extensión
  try {
    const data = await chrome.storage.local.get(['hostname', 'identityPolicy']);
    if (data.hostname && hostnameText) {
      hostnameText.textContent = data.hostname;
    }

    const ident = data.identityPolicy || {};
    if (ident.allowedGoogleDomains && allowedDomainBox && allowedDomainText) {
      allowedDomainBox.style.display = 'flex';
      allowedDomainText.textContent = `Solo se permiten cuentas institucionales oficiales (@${ident.allowedGoogleDomains})`;
    }
  } catch (err) {
    console.error('Error al cargar metadatos en blocked_auth:', err);
  }

  // Eventos de botones
  if (btnUnderstood) {
    btnUnderstood.addEventListener('click', () => {
      window.close();
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://www.upc.edu.pe';
      }
    });
  }
});
