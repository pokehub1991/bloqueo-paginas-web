import React from 'react';
import { CheckSquare, Unlock, ShieldAlert, X } from 'lucide-react';

export default function BulkActionBar({
  selectedCount = 0,
  onOpenApplyRules,
  onUnblockSelected,
  onClearSelection,
  isLoading = false
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-scale-in">
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-elevated/95 backdrop-blur-md border border-brand-500/30 shadow-2xl shadow-black/60 text-white">
        <div className="flex items-center gap-2 pl-2">
          <div className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
            {selectedCount}
          </div>
          <span className="text-xs md:text-sm font-medium">
            {selectedCount === 1 ? 'computadora seleccionada' : 'computadoras seleccionadas'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenApplyRules}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-md shadow-brand-500/20 active:scale-95 disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Asignar páginas</span>
          </button>

          <button
            onClick={onUnblockSelected}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-emerald-500/20 border border-border text-foreground-muted hover:text-emerald-400 text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Desbloquear todo</span>
          </button>

          <button
            onClick={onClearSelection}
            className="p-1.5 rounded-xl hover:bg-surface-highlight text-foreground-subtle hover:text-white transition"
            title="Cancelar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
