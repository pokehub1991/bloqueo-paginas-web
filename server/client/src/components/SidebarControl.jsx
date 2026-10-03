import React, { useState } from 'react';
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
  ExternalLink 
} from 'lucide-react';

export default function SidebarControl({
  selectedHostnames = [],
  devices = [],
  onApplyPolicy,
  onAddUrlToSelected,
  onRemoveRuleUrl,
  onUpdateRuleUrl,
  onUnblockSelected,
  onSelectAllVisible,
  isLoading = false
}) {
  const [selectedMode, setSelectedMode] = useState('block_list'); // 'block_all' | 'allow_list' | 'block_list' | 'none'
  const [inputUrl, setInputUrl] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Estado para edición en línea de URLs
  const [editingUrl, setEditingUrl] = useState(null);
  const [editUrlValue, setEditUrlValue] = useState('');

  const selectedCount = selectedHostnames.length;

  const showLocalFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Obtener URLs actuales de los equipos seleccionados para el modo activo
  const selectedDevices = devices.filter(d => selectedHostnames.includes(d.hostname));
  const activeUrlsSet = new Set();
  for (const d of selectedDevices) {
    const list = selectedMode === 'allow_list' ? (d.allowedUrls || []) : (d.blockedUrls || []);
    list.forEach(u => activeUrlsSet.add(u));
  }
  const currentUrls = Array.from(activeUrlsSet);

  // Manejo de cambio de modo y aplicación
  const handleApplyMode = (modeToApply) => {
    const targetMode = modeToApply || selectedMode;
    if (selectedCount === 0) {
      showLocalFeedback('⚠️ Marca primero las casillas de los equipos en la tabla.');
      return;
    }

    onApplyPolicy({
      hostnames: selectedHostnames,
      policyMode: targetMode,
      urls: [],
      mode: 'add'
    });
  };

  // Agregar URL escrita
  const handleAddCustomUrl = (e) => {
    e.preventDefault();
    const clean = inputUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) return;

    if (selectedCount === 0) {
      showLocalFeedback('⚠️ Marca primero los equipos a los que deseas agregar este sitio.');
      return;
    }

    onAddUrlToSelected(clean, selectedMode);
    setInputUrl('');
  };

  // Clic en chip de URL más usada
  const handleChipClick = (url) => {
    if (selectedCount === 0) {
      showLocalFeedback(`⚠️ Selecciona equipos para agregar "${url}".`);
      return;
    }
    onAddUrlToSelected(url, selectedMode);
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
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/30 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-5">
      {/* Encabezado del Panel Lateral */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
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
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 animate-bounce-short">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. SELECCIÓN DE LOS 3 MODOS DE NAVEGACIÓN */}
      <div>
        <div className="space-y-2">
          {/* Opción 1: Bloquear Todo */}
          <div
            onClick={() => setSelectedMode('block_all')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 text-xs ${
              selectedMode === 'block_all'
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500 shadow-md shadow-rose-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="sidebar_mode"
              checked={selectedMode === 'block_all'}
              onChange={() => setSelectedMode('block_all')}
              className="accent-rose-500 w-4 h-4 cursor-pointer"
            />
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-white text-xs">Bloquear todo</div>
              <div className="text-[11px] opacity-80">Bloquea toda navegación web</div>
            </div>
          </div>

          {/* Opción 2: Permitir Lista */}
          <div
            onClick={() => setSelectedMode('allow_list')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 text-xs ${
              selectedMode === 'allow_list'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="sidebar_mode"
              checked={selectedMode === 'allow_list'}
              onChange={() => setSelectedMode('allow_list')}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-white text-xs">Permitir lista</div>
              <div className="text-[11px] opacity-80">Solo permite los sitios autorizados</div>
            </div>
          </div>

          {/* Opción 3: Bloquear Lista */}
          <div
            onClick={() => setSelectedMode('block_list')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 text-xs ${
              selectedMode === 'block_list'
                ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="sidebar_mode"
              checked={selectedMode === 'block_list'}
              onChange={() => setSelectedMode('block_list')}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-white text-xs">Bloquear lista</div>
              <div className="text-[11px] opacity-80">Bloquea los sitios especificados</div>
            </div>
          </div>

          {/* Opción 4: Navegación Libre */}
          <div
            onClick={() => setSelectedMode('none')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 text-xs ${
              selectedMode === 'none'
                ? 'bg-blue-500/20 border-blue-500 text-blue-200 ring-1 ring-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="sidebar_mode"
              checked={selectedMode === 'none'}
              onChange={() => setSelectedMode('none')}
              className="accent-blue-500 w-4 h-4 cursor-pointer"
            />
            <Globe className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-white text-xs">Navegación libre</div>
              <div className="text-[11px] opacity-80">Sin ninguna restricción</div>
            </div>
          </div>
        </div>

        {/* Botón Aplicar a... con estilo de alto contraste y legibilidad absoluta */}
        <button
          type="button"
          onClick={() => handleApplyMode(selectedMode)}
          disabled={isLoading || selectedCount === 0}
          className="mt-3.5 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-950/60 border border-emerald-400/50 flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
      <div className="border-t border-border/80 pt-4">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5 flex items-center justify-between">
          <span>Agregar Página</span>
          <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
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

      {/* 3. ADMINISTRADOR DE PÁGINAS (EDITAR Y ELIMINAR URLs) */}
      {(selectedMode === 'allow_list' || selectedMode === 'block_list') && (
        <div className="border-t border-border/80 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>{selectedMode === 'allow_list' ? 'Sitios Autorizados' : 'Sitios Restringidos'}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-brand-300 border border-slate-700">
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
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-elevated border border-border text-xs group hover:border-slate-600 transition"
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
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
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
