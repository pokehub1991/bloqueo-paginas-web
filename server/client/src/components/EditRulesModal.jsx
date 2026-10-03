import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Trash2, Globe, Check, Unlock, AlertCircle } from 'lucide-react';

export default function EditRulesModal({
  isOpen,
  onClose,
  targetHostnames = [],
  initialUrls = [],
  onSaveRules,
  onUnblockAll,
  isLoading = false
}) {
  const [urls, setUrls] = useState(initialUrls);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddUrl = (e) => {
    e.preventDefault();
    setError('');
    const clean = newUrlInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!clean) return;

    if (urls.includes(clean)) {
      setError('Esta dirección ya está en la lista de restricciones.');
      return;
    }

    setUrls(prev => [...prev, clean]);
    setNewUrlInput('');
  };

  const handleRemoveUrl = (targetUrl) => {
    setUrls(prev => prev.filter(u => u !== targetUrl));
  };

  const handleSave = () => {
    onSaveRules(targetHostnames, urls);
  };

  const isMulti = targetHostnames.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
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
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isMulti
                ? `Reglas para ${targetHostnames.length} computadoras`
                : `Reglas para ${targetHostnames[0] || 'Computadora'}`}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isMulti
                ? `Las direcciones agregadas aquí se aplicarán a: ${targetHostnames.join(', ')}`
                : 'Configura qué sitios web estarán bloqueados en este equipo.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input para agregar una nueva URL */}
        <form onSubmit={handleAddUrl} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={newUrlInput}
              onChange={(e) => setNewUrlInput(e.target.value)}
              placeholder="Ej. youtube.com o tiktok.com"
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

        {/* Lista de URLs actualmente bloqueadas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Páginas restringidas ({urls.length})
            </span>

            {urls.length > 0 && (
              <button
                type="button"
                onClick={() => setUrls([])}
                className="text-xs text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Limpiar lista</span>
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 rounded-xl bg-surface-elevated/40 border border-border">
            {urls.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground-subtle">
                No hay páginas bloqueadas. La navegación en estos equipos será completamente libre.
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
                    title="Remover regla"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

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
            <span>{isLoading ? 'Aplicando cambios en la computadora...' : 'Guardar y aplicar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
