import React from 'react';
import { Building2, X, Check, ArrowRight, Laptop, Monitor, Layers } from 'lucide-react';

export default function PavilionModal({
  isOpen,
  onClose,
  pavilions = [],
  selectedPavilion,
  onSelectPavilion,
  totalDevices = 0
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 animate-scale-up">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-foreground-subtle hover:text-white hover:bg-surface-elevated transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Selecciona el Pabellón a Gestionar
            </h3>
            <p className="text-sm text-foreground-muted">
              Elige el pabellón universitario para supervisar y aplicar directivas a sus laboratorios de cómputo.
            </p>
          </div>
        </div>

        {/* Grid de Pabellones interactivos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
          {/* Tarjeta Todos */}
          <div
            onClick={() => {
              onSelectPavilion('ALL');
              onClose();
            }}
            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between group ${
              selectedPavilion === 'ALL'
                ? 'bg-brand-500/15 border-brand-500 shadow-md ring-1 ring-brand-500'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-brand-400 group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Todos</h4>
                <p className="text-xs text-foreground-muted">{totalDevices} equipos registrados</p>
              </div>
            </div>
            {selectedPavilion === 'ALL' && (
              <span className="p-1 rounded-full bg-brand-500 text-white">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Tarjetas individuales de Pabellón */}
          {pavilions.map((pab) => {
            const isSelected = selectedPavilion === pab.code;
            return (
              <div
                key={pab.code}
                onClick={() => {
                  onSelectPavilion(pab.code);
                  onClose();
                }}
                className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500 shadow-md ring-1 ring-brand-500'
                    : 'bg-surface-elevated hover:bg-surface-highlight border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base transition group-hover:scale-105 ${
                    isSelected ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface border border-border text-brand-400'
                  }`}>
                    {pab.code.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{pab.label}</h4>
                    <p className="text-xs text-foreground-muted">
                      {pab.labsCount} {pab.labsCount === 1 ? 'laboratorio' : 'laboratorios'} · {pab.deviceCount} equipos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {pab.onlineCount}
                  </span>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-brand-500 text-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón continuar */}
        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition active:scale-95 shadow-lg shadow-brand-500/20"
          >
            <span>Ir al panel de laboratorios</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
