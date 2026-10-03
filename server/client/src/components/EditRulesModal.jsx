import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Globe, 
  Check, 
  Ban, 
  CheckCircle2, 
  AlertTriangle,
  AlertCircle 
} from 'lucide-react';

export default function EditRulesModal({
  isOpen,
  onClose,
  targetHostnames = [],
  initialUrls = [],
  initialMode = 'block_list',
  onSaveRules,
  isLoading = false
}) {
  const [policyMode, setPolicyMode] = useState(initialMode);
  const [urls, setUrls] = useState(initialUrls);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPolicyMode(initialMode || 'block_list');
    setUrls(initialUrls || []);
    setNewUrlInput('');
    setError('');
  }, [isOpen, initialMode, initialUrls]);

  if (!isOpen) return null;

  const handleAddUrl = (e) => {
    e.preventDefault();
    setError('');
    const clean = newUrlInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) return;

    if (urls.includes(clean)) {
      setError('Esta dirección ya se encuentra en la lista.');
      return;
    }

    setUrls(prev => [...prev, clean]);
    setNewUrlInput('');
  };

  const handleRemoveUrl = (targetUrl) => {
    setUrls(prev => prev.filter(u => u !== targetUrl));
  };

  const handleSave = () => {
    onSaveRules(targetHostnames, urls, policyMode);
  };

  const isMulti = targetHostnames.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 md:p-8 animate-scale-in">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-foreground-subtle hover:text-foreground hover:bg-surface-highlight rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isMulti
                ? `Directivas para ${targetHostnames.length} equipos`
                : `Directivas para ${targetHostnames[0] || 'Equipo'}`}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isMulti
                ? `Afectará a los laboratorios de: ${targetHostnames.join(', ')}`
                : 'Configura el modo de navegación y la lista de sitios permitidos o restringidos.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selector de los 3 Modos */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
            Selecciona el modo de navegación:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* 1. Bloquear todo */}
            <div
              onClick={() => setPolicyMode('block_all')}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                policyMode === 'block_all'
                  ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                  : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted'
              }`}
            >
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Bloquear todo</div>
                <div className="text-[10px] opacity-75">Sin navegación</div>
              </div>
            </div>

            {/* 2. Permitir lista */}
            <div
              onClick={() => setPolicyMode('allow_list')}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                policyMode === 'allow_list'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Permitir lista</div>
                <div className="text-[10px] opacity-75">Solo autorizados</div>
              </div>
            </div>

            {/* 3. Bloquear lista */}
            <div
              onClick={() => setPolicyMode('block_list')}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                policyMode === 'block_list'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                  : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Bloquear lista</div>
                <div className="text-[10px] opacity-75">Sitios restringidos</div>
              </div>
            </div>

            {/* 4. Navegación libre */}
            <div
              onClick={() => setPolicyMode('none')}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                policyMode === 'none'
                  ? 'bg-blue-500/15 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                  : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted'
              }`}
            >
              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Navegación libre</div>
                <div className="text-[10px] opacity-75">Sin restricciones</div>
              </div>
            </div>
          </div>
        </div>

        {/* Input para agregar una nueva URL si el modo lo requiere */}
        {(policyMode === 'allow_list' || policyMode === 'block_list') && (
          <>
            <form onSubmit={handleAddUrl} className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                <input
                  type="text"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  placeholder={policyMode === 'allow_list' ? "Ej. wikipedia.org o google.com" : "Ej. youtube.com o tiktok.com"}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-elevated border border-border text-white text-xs focus:outline-none focus:border-brand-400 transition"
                />
              </div>
              <button
                type="submit"
                disabled={!newUrlInput.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition active:scale-95 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </form>

            {/* Lista de URLs */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                  {policyMode === 'allow_list' ? `Sitios Permitidos (${urls.length})` : `Sitios Bloqueados (${urls.length})`}
                </span>

                {urls.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUrls([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Limpiar lista
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 rounded-xl bg-surface-elevated/40 border border-border">
                {urls.length === 0 ? (
                  <div className="p-4 text-center text-xs text-foreground-subtle">
                    {policyMode === 'allow_list'
                      ? 'No hay sitios permitidos definidos. La navegación estará completamente bloqueada.'
                      : 'No hay sitios restringidos en la lista.'}
                  </div>
                ) : (
                  urls.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated border border-border text-xs text-white"
                    >
                      <span className="font-mono text-brand-400">{url}</span>
                      <button
                        onClick={() => handleRemoveUrl(url)}
                        className="p-1 text-foreground-subtle hover:text-rose-400 rounded transition"
                        title="Remover de la lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {policyMode === 'block_all' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-5 flex items-start gap-2.5">
            <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-white mb-0.5">Bloqueo Total Activado</strong>
              Los navegadores de los equipos seleccionados bloquearán el acceso a cualquier dirección URL. Ideal para evaluaciones o exámenes prácticos.
            </div>
          </div>
        )}

        {policyMode === 'none' && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs mb-5 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-white mb-0.5">Navegación Libre</strong>
              Se removerán todas las directivas de restricción en Chrome, Edge, Firefox y Opera para estas computadoras.
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-white rounded-xl transition hover:bg-surface-highlight"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isLoading ? 'Aplicando cambios en el laboratorio...' : 'Guardar y aplicar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
