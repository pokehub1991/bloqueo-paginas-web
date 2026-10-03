// Script para el popup de UPC NetShield (Modo Solo Lectura Institucional)

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const policyBadge = document.getElementById('policyBadge');
  const policyDetail = document.getElementById('policyDetail');
  const rulesPreview = document.getElementById('rulesPreview');
  const rulesPreviewTitle = document.getElementById('rulesPreviewTitle');
  const rulesChipsBox = document.getElementById('rulesChipsBox');

  const hostnameVal = document.getElementById('hostnameVal');
  const ipValue = document.getElementById('ipValue');
  const lastSyncValue = document.getElementById('lastSyncValue');

  async function loadUI() {
    const data = await chrome.storage.local.get([
      'hostname',
      'serverUrl',
      'policyMode',
      'blockedUrls',
      'allowedUrls',
      'isConnected',
      'lastSyncTime',
      'ip',
      'lastError'
    ]);

    hostnameVal.textContent = data.hostname || 'PC-LAB';
    ipValue.textContent = data.ip || '127.0.0.1';
    lastSyncValue.textContent = data.lastSyncTime || 'Sincronizado';

    // Estado de conexión
    if (data.isConnected) {
      statusDot.className = 'status-dot status-online';
      statusText.textContent = 'En línea';
    } else {
      statusDot.className = 'status-dot status-offline';
      statusText.textContent = data.lastError ? 'Sin conexión' : 'Desconectado';
    }

    // Directiva
    const mode = data.policyMode || 'none';
    const blockedList = data.blockedUrls || [];
    const allowedList = data.allowedUrls || [];

    policyBadge.className = `policy-tag ${mode}`;

    if (mode === 'block_all') {
      policyBadge.textContent = 'Bloqueo Total';
      policyDetail.textContent = 'Toda la navegación web externa está inhabilitada en este laboratorio.';
      rulesPreview.style.display = 'none';
    } else if (mode === 'allow_list') {
      policyBadge.textContent = `Permitir Lista (${allowedList.length})`;
      if (allowedList.length > 0) {
        policyDetail.textContent = 'Solo se autoriza el acceso a las páginas académicas aprobadas:';
        rulesPreview.style.display = 'block';
        rulesPreviewTitle.textContent = 'Sitios autorizados:';
        renderChips(allowedList);
      } else {
        policyDetail.textContent = 'Sin páginas autorizadas (bloqueo total activo).';
        rulesPreview.style.display = 'none';
      }
    } else if (mode === 'block_list') {
      if (blockedList.length > 0) {
        policyBadge.textContent = `Bloquear Lista (${blockedList.length})`;
        policyDetail.textContent = 'Se restringe el acceso a los siguientes sitios:';
        rulesPreview.style.display = 'block';
        rulesPreviewTitle.textContent = 'Sitios restringidos:';
        renderChips(blockedList);
      } else {
        policyBadge.textContent = 'Navegación Libre';
        policyDetail.textContent = 'Sin directivas restrictivas. Navegación libre.';
        rulesPreview.style.display = 'none';
      }
    } else {
      policyBadge.textContent = 'Navegación Libre';
      policyDetail.textContent = 'Sin directivas restrictivas. Navegación libre.';
      rulesPreview.style.display = 'none';
    }
  }

  function renderChips(urls) {
    rulesChipsBox.innerHTML = '';
    const maxShow = 6;
    const items = urls.slice(0, maxShow);
    for (const u of items) {
      const chip = document.createElement('span');
      chip.className = 'rule-chip';
      chip.textContent = u;
      rulesChipsBox.appendChild(chip);
    }
    if (urls.length > maxShow) {
      const extra = document.createElement('span');
      extra.className = 'rule-chip rule-chip-more';
      extra.textContent = `+${urls.length - maxShow} más`;
      rulesChipsBox.appendChild(extra);
    }
  }

  await loadUI();
});
