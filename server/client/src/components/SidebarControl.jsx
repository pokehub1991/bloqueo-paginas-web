import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Plus, 
  Check, 
  Unlock, 
  AlertCircle, 
  Pencil, 
  Trash2, 
  X, 
  ExternalLink,
  Star,
  Sparkles
} from 'lucide-react';

export default function SidebarControl({
  selectedHostnames = [],
  devices = [],
  favorites = [],
  onApplyPolicy,
  onAddUrlToSelected,
  onRemoveRuleUrl,
  onUpdateRuleUrl,
  onUnblockSelected,
  onSelectAllVisible,
  isLoading = false
}) {
  const [selectedMode, setSelectedMode] = useState('none'); // 'none' (Navegación libre por defecto) | 'block_list' | 'allow_list' | 'block_all'
  const [inputUrl, setInputUrl] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const prevSelectionKeyRef = useRef(null);

  // Estado para edición en línea de URLs
  const [editingUrl, setEditingUrl] = useState(null);
  const [editUrlValue, setEditUrlValue] = useState('');

  const selectedCount = selectedHostnames.length;

  const showLocalFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Sincronizar automáticamente el modo SOLO cuando el usuario cambia de equipo seleccionado en la tabla.
  // El polling de segundo plano de 'devices' ya NO reinicia ni sobreescribe la elección manual del usuario.
  useEffect(() => {
    const currentSelectionKey = selectedHostnames.slice().sort().join(',');

    // Si la selección no ha cambiado (por ejemplo, al actualizarse devices en segundo plano), NO tocar selectedMode
    if (prevSelectionKeyRef.current !== null && currentSelectionKey === prevSelectionKeyRef.current) {
      return;
    }
    prevSelectionKeyRef.current = currentSelectionKey;

    if (selectedHostnames.length === 0) {
      setSelectedMode('none');
      return;
    }

    const currentSelectedDevices = devices.filter(d => selectedHostnames.includes(d.hostname));
    if (currentSelectedDevices.length === 0) {
      setSelectedMode('none');
      return;
    }

    // Si algún equipo seleccionado tiene modo restrictivo activo con reglas o bloqueo total:
    const anyBlockAll = currentSelectedDevices.some(d => d.policyMode === 'block_all');
    if (anyBlockAll) {
      setSelectedMode('block_all');
      return;
    }

    const anyAllowWithUrls = currentSelectedDevices.some(d => 
      d.policyMode === 'allow_list' && d.allowedUrls && d.allowedUrls.length > 0
    );
    if (anyAllowWithUrls) {
      setSelectedMode('allow_list');
      return;
    }

    const anyBlockWithUrls = currentSelectedDevices.some(d => 
      (d.policyMode === 'block_list' || !d.policyMode) && d.blockedUrls && d.blockedUrls.length > 0
    );
    if (anyBlockWithUrls) {
      setSelectedMode('block_list');
      return;
    }

    // Si no tiene ninguna regla aplicada, preseleccionar "Navegación libre" ('none')
    setSelectedMode('none');
  }, [selectedHostnames]);

  // Obtener equipos seleccionados
  const selectedDevices = devices.filter(d => selectedHostnames.includes(d.hostname));

  // Obtener URLs actuales de los equipos seleccionados para el modo activo
  const activeUrlsSet = new Set();
  for (const d of selectedDevices) {
    const list = selectedMode === 'allow_list' ? (d.allowedUrls || []) : (d.blockedUrls || []);
    list.forEach(u => activeUrlsSet.add(u));
  }
  const currentUrls = Array.from(activeUrlsSet);

  // Equipos con reglas y equipos sin reglas dentro de la selección
  const configuredDevices = selectedDevices.filter(d => {
    const list = selectedMode === 'allow_list' ? d.allowedUrls : d.blockedUrls;
    return list && list.length > 0;
  });
  const unconfiguredDevices = selectedDevices.filter(d => {
    const list = selectedMode === 'allow_list' ? d.allowedUrls : d.blockedUrls;
    return !list || list.length === 0;
  });

  const primaryDevice = configuredDevices[0];
  const willInherit = configuredDevices.length > 0 && unconfiguredDevices.length > 0 && (selectedMode === 'block_list' || selectedMode === 'allow_list');

  // Catálogo de Favoritos únicos (deduplicados y estrictamente manuales)
  const uniqueFavorites = React.useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const f of favorites) {
      if (f.category && f.category !== 'Frecuentes') continue;
      const clean = (f.url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push({
          id: f.id,
          title: f.title || clean,
          url: clean
        });
      }
    }
    return list;
  }, [favorites]);

  // Manejo de cambio de modo y aplicación con HERENCIA AUTOMÁTICA
  const handleApplyMode = (modeToApply) => {
    const targetMode = modeToApply || selectedMode;
    if (selectedCount === 0) {
      showLocalFeedback('⚠️ Marca primero las casillas de los equipos en la tabla.');
      return;
    }

    if (targetMode === 'none') {
      onUnblockSelected();
      return;
    }

    // Si el modo es restrictivo (block_list o allow_list), heredamos las páginas del equipo principal
    // para replicarlas inmediatamente a todos los equipos seleccionados sin reglas
    const urlsToApply = targetMode === 'block_all' ? [] : currentUrls;

    onApplyPolicy({
      hostnames: selectedHostnames,
      policyMode: targetMode,
      urls: urlsToApply,
      mode: 'replace'
    });

    if (urlsToApply.length > 0 && unconfiguredDevices.length > 0) {
      showLocalFeedback(`✨ Reglas heredadas a ${unconfiguredDevices.length} equipo(s) sin reglas.`);
    }
  };

  // Agregar URL escrita y heredar a todos los seleccionados
  const handleAddCustomUrl = (e) => {
    e.preventDefault();
    const clean = inputUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) return;

    if (selectedCount === 0) {
      showLocalFeedback('⚠️ Marca primero los equipos a los que deseas agregar este sitio.');
      return;
    }

    const effectiveMode = (selectedMode === 'none' || selectedMode === 'block_all') ? 'block_list' : selectedMode;
    if (selectedMode !== effectiveMode) {
      setSelectedMode(effectiveMode);
    }

    const combinedUrls = Array.from(new Set([...currentUrls, clean]));
    onApplyPolicy({
      hostnames: selectedHostnames,
      policyMode: effectiveMode,
      urls: combinedUrls,
      mode: 'replace'
    });
    setInputUrl('');
    showLocalFeedback(`✅ "${clean}" guardado en reglas y agregado a favoritos.`);
  };

  // Clic en chip de URL favorita / frecuente
  const handleChipClick = (url) => {
    const clean = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) return;

    if (selectedCount === 0) {
      setInputUrl(clean);
      showLocalFeedback(`💡 "${clean}" seleccionado. Marca equipos en la tabla para aplicarlo.`);
      return;
    }

    const effectiveMode = (selectedMode === 'none' || selectedMode === 'block_all') ? 'block_list' : selectedMode;
    if (selectedMode !== effectiveMode) {
      setSelectedMode(effectiveMode);
    }

    const combinedUrls = Array.from(new Set([...currentUrls, clean]));
    onApplyPolicy({
      hostnames: selectedHostnames,
      policyMode: effectiveMode,
      urls: combinedUrls,
      mode: 'replace'
    });
    showLocalFeedback(`✅ "${clean}" aplicado a ${selectedCount} equipo(s).`);
  };

  // Iniciar edición de una URL
  const handleStartEdit = (url) => {
    setEditingUrl(url);
    setEditUrlValue(url);
  };

  // Guardar edición de una URL
  const handleSaveEdit = (oldUrl) => {
    const cleanNew = editUrlValue.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!cleanNew || cleanNew === oldUrl) {
      setEditingUrl(null);
      return;
    }
    if (onUpdateRuleUrl) {
      onUpdateRuleUrl(oldUrl, cleanNew, selectedMode);
    }
    setEditingUrl(null);
  };

  // Eliminar una URL
  const handleDeleteUrl = (url) => {
    if (onRemoveRuleUrl) {
      onRemoveRuleUrl(url, selectedMode);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/30 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-5">
      {/* Encabezado del Panel Lateral */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>Reglas</span>
            </h3>
            <p className="text-xs text-foreground-muted">
              {selectedCount > 0 ? (
                <span className="text-emerald-400 font-semibold">{selectedCount} equipo(s) seleccionado(s)</span>
              ) : (
                <span className="text-foreground-subtle">Ningún equipo seleccionado</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de feedback local */}
      {feedbackMsg && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 animate-slide-down">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. SELECCIÓN DE LOS 4 MODOS DE NAVEGACIÓN (COMPACTO 2x2) */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          {/* Opción 1: Bloquear Todo */}
          <button
            type="button"
            onClick={() => setSelectedMode('block_all')}
            className={`p-2 rounded-xl border cursor-pointer transition-all duration-150 flex items-center gap-2 text-left select-none active:scale-[0.98] ${
              selectedMode === 'block_all'
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500/60 shadow-sm shadow-rose-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
            title="Bloquear todo: inhabilita toda la navegación web"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${selectedMode === 'block_all' ? 'bg-rose-500/30 text-rose-300' : 'bg-surface text-rose-400'}`}>
              <Ban className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs leading-tight truncate text-white">Bloquear todo</div>
              <div className="text-[10px] text-foreground-subtle leading-none mt-0.5 truncate">Totalidad</div>
            </div>
            {selectedMode === 'block_all' && <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
          </button>

          {/* Opción 2: Permitir Lista */}
          <button
            type="button"
            onClick={() => setSelectedMode('allow_list')}
            className={`p-2 rounded-xl border cursor-pointer transition-all duration-150 flex items-center gap-2 text-left select-none active:scale-[0.98] ${
              selectedMode === 'allow_list'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/60 shadow-sm shadow-emerald-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
            title="Permitir lista: solo autoriza páginas aprobadas"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${selectedMode === 'allow_list' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-surface text-emerald-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs leading-tight truncate text-white">Permitir lista</div>
              <div className="text-[10px] text-foreground-subtle leading-none mt-0.5 truncate">Exclusivo</div>
            </div>
            {selectedMode === 'allow_list' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
          </button>

          {/* Opción 3: Bloquear Lista */}
          <button
            type="button"
            onClick={() => setSelectedMode('block_list')}
            className={`p-2 rounded-xl border cursor-pointer transition-all duration-150 flex items-center gap-2 text-left select-none active:scale-[0.98] ${
              selectedMode === 'block_list'
                ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/60 shadow-sm shadow-amber-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
            title="Bloquear lista: restringe los sitios especificados"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${selectedMode === 'block_list' ? 'bg-amber-500/30 text-amber-300' : 'bg-surface text-amber-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs leading-tight truncate text-white">Bloquear lista</div>
              <div className="text-[10px] text-foreground-subtle leading-none mt-0.5 truncate">Específico</div>
            </div>
            {selectedMode === 'block_list' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </button>

          {/* Opción 4: Navegación Libre */}
          <button
            type="button"
            onClick={() => setSelectedMode('none')}
            className={`p-2 rounded-xl border cursor-pointer transition-all duration-150 flex items-center gap-2 text-left select-none active:scale-[0.98] ${
              selectedMode === 'none'
                ? 'bg-sky-500/20 border-sky-500 text-sky-200 ring-1 ring-sky-500/60 shadow-sm shadow-sky-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
            title="Navegación libre: sin ninguna restricción"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${selectedMode === 'none' ? 'bg-sky-500/30 text-sky-300' : 'bg-surface text-sky-400'}`}>
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs leading-tight truncate text-white">Navegación libre</div>
              <div className="text-[10px] text-foreground-subtle leading-none mt-0.5 truncate">Sin restricción</div>
            </div>
            {selectedMode === 'none' && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
          </button>
        </div>

        {/* Banner de Herencia Inteligente de Reglas */}
        {willInherit && (
          <div className="mt-2.5 p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <strong>Herencia automática:</strong> {unconfiguredDevices.length} equipo(s) heredarán {currentUrls.length} página(s) de <span className="font-mono font-bold text-white">{primaryDevice.hostname}</span>.
            </div>
          </div>
        )}

        {/* Botón Aplicar a... con estilo de alto contraste y legibilidad absoluta */}
        <button
          type="button"
          onClick={() => handleApplyMode(selectedMode)}
          disabled={isLoading || selectedCount === 0}
          className="mt-2.5 w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm tracking-wide shadow-md shadow-emerald-950/60 border border-emerald-400/50 flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span className="text-white drop-shadow-sm font-bold">
            {selectedCount > 0 
              ? `Aplicar a ${selectedCount} equipo(s)` 
              : 'Aplicar a seleccionados'}
          </span>
        </button>
      </div>

      {/* 2. AGREGAR PÁGINA (PERSISTENCIA TOTAL) */}
      <div className="border-t border-border/80 pt-3.5">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1 flex items-center justify-between">
          <span>Agregar Página</span>
          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15">
            Persistente
          </span>
        </label>
        <p className="text-[11px] text-foreground-muted mb-2">
          {selectedMode === 'allow_list' ? 'Sitio que se autorizará:' : 'Sitio que se restringirá:'}
        </p>

        <form onSubmit={handleAddCustomUrl} className="flex gap-1.5">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="ej: youtube.com o wikipedia.org"
            className="flex-1 bg-surface-elevated border border-border focus:border-brand-500 text-white rounded-xl px-3 py-2 text-xs outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputUrl.trim() || isLoading}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-bold transition active:scale-95 shrink-0 flex items-center gap-1 shadow-md shadow-brand-500/20 cursor-pointer"
            title="Agregar a las páginas guardadas"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </form>
      </div>

      {/* 3. SITIOS FRECUENTES / FAVORITOS (SOLO CUANDO EXISTAN URLs AGREGADAS) */}
      {uniqueFavorites.length > 0 && (
        <div className="border-t border-border/80 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span>Favoritos</span>
            </label>
            <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-md bg-amber-500/15">
              {uniqueFavorites.length} {uniqueFavorites.length === 1 ? 'sitio' : 'sitios'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {uniqueFavorites.map((fav) => {
              const isAlreadyActive = currentUrls.includes(fav.url);
              return (
                <button
                  key={fav.id || fav.url}
                  type="button"
                  onClick={() => handleChipClick(fav.url)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer select-none active:scale-95 group/fav ${
                    isAlreadyActive
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300 font-bold'
                      : 'bg-surface-elevated hover:bg-surface-highlight hover:border-amber-400/50 hover:text-white border-border text-foreground-muted'
                  }`}
                  title={isAlreadyActive ? `"${fav.url}" ya está en la lista de reglas` : `Agregar "${fav.url}" a los seleccionados`}
                >
                  <span className="font-mono text-[11px] truncate max-w-[120px]">{fav.title || fav.url}</span>
                  {isAlreadyActive ? (
                    <Check className="w-3 h-3 text-brand-400 shrink-0" />
                  ) : (
                    <Plus className="w-3 h-3 opacity-50 group-hover/fav:opacity-100 group-hover/fav:text-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ADMINISTRADOR DE PÁGINAS (EDITAR Y ELIMINAR URLs) */}
      {(selectedMode === 'allow_list' || selectedMode === 'block_list') && (
        <div className="border-t border-border/80 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>{selectedMode === 'allow_list' ? 'Sitios Autorizados' : 'Sitios Restringidos'}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-highlight text-brand-300 tabular-nums">
                {currentUrls.length}
              </span>
            </label>
          </div>

          <p className="text-[11px] text-foreground-muted mb-2">
            {selectedCount > 0 
              ? 'Puedes editar o eliminar cualquier sitio de los equipos seleccionados:' 
              : 'Selecciona equipos en la tabla para ver y editar sus páginas:'}
          </p>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {currentUrls.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border text-center text-[11px] text-foreground-subtle">
                {selectedCount > 0
                  ? 'No hay páginas añadidas a esta lista aún.'
                  : 'Marca casillas en la tabla para gestionar las páginas.'}
              </div>
            ) : (
              currentUrls.map((url) => {
                const isEditingThis = editingUrl === url;

                return (
                  <div
                    key={url}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-elevated border border-border text-xs group hover:border-border-strong transition"
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editUrlValue}
                          onChange={(e) => setEditUrlValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(url);
                            if (e.key === 'Escape') setEditingUrl(null);
                          }}
                          className="flex-1 bg-surface border border-brand-400 text-white rounded-lg px-2 py-1 text-xs outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(url)}
                          className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition"
                          title="Guardar cambio"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUrl(null)}
                          className="p-1 rounded bg-surface hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white transition"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 font-mono text-white truncate text-[11px]">
                          <Globe className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                          <span className="truncate">{url}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Botón Editar URL */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(url)}
                            className="p-1.5 rounded-lg text-foreground-subtle hover:text-brand-300 hover:bg-brand-500/10 transition"
                            title="Editar esta dirección URL"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>

                          {/* Botón Eliminar URL */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUrl(url)}
                            className="p-1.5 rounded-lg text-foreground-subtle hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Eliminar esta dirección de la lista"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}


      {/* 5. BOTÓN LIBERAR NAVEGACIÓN */}
      {selectedCount > 0 && (
        <div className="border-t border-border/80 pt-3">
          <button
            onClick={onUnblockSelected}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-surface-elevated hover:bg-emerald-500/20 border border-border hover:border-emerald-500/40 text-xs text-foreground-muted hover:text-emerald-300 font-semibold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-emerald-400" />
            <span>Liberar navegación de seleccionados ({selectedCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
