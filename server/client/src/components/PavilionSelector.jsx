import React from 'react';
import { Building2, Layers, CheckSquare, Sparkles, Trash2 } from 'lucide-react';

export default function PavilionSelector({
  pavilions = [],
  laboratories = [],
  selectedPavilion = 'ALL',
  selectedLab = 'ALL',
  onSelectPavilion,
  onSelectLab,
  onSelectWholeLab,
  onDeleteLab,
  totalDevices = 0,
  totalOnline = 0
}) {
  // Lista oficial de pabellones disponibles
  const OFFICIAL_PAVILIONS = [
    { code: 'ALL', label: 'Todos' },
    { code: 'A', label: 'Pabellón A' },
    { code: 'E', label: 'Pabellón E' },
    { code: 'G', label: 'Pabellón G' },
    { code: 'H', label: 'Pabellón H' },
    { code: 'Sin asignar', label: 'Sin asignar' }
  ];

  // Encontrar info de cada pabellón oficial
  const getPavilionStats = (code) => {
    if (code === 'ALL') return { deviceCount: totalDevices, onlineCount: totalOnline, labsCount: laboratories.length };
    const found = pavilions.find(p => p.code === code);
    return found || { deviceCount: 0, onlineCount: 0, labsCount: 0 };
  };

  // Filtrar los laboratorios que pertenecen al pabellón activo
  const visibleLabs = selectedPavilion === 'ALL'
    ? laboratories
    : laboratories.filter(lab => lab.pavilion === selectedPavilion);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-5 shadow-xl shadow-black/20 space-y-4">
      {/* Encabezado y resumen de equipos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <span>Navegación de Pabellones y Laboratorios</span>
            </h2>
            <p className="text-xs text-foreground-muted">
              Pabellones habilitados: <strong>A, E, G, H</strong> y <strong>Sin asignar</strong>.
            </p>
          </div>
        </div>

        {/* Contador de equipos */}
        <div className="flex items-center gap-2 text-xs self-start sm:self-auto px-3 py-1.5 rounded-xl bg-surface-elevated">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-white">{totalOnline}</span>
          <span className="text-foreground-muted">de {totalDevices} equipos en línea</span>
        </div>
      </div>

      {/* NIVEL 1: PABELLONES (Chips Minimalistas) */}
      <div className="flex flex-wrap items-center gap-2">
        {OFFICIAL_PAVILIONS.map((pab) => {
          const isSelected = selectedPavilion === pab.code;
          const stats = getPavilionStats(pab.code);

          return (
            <button
              key={pab.code}
              onClick={() => {
                onSelectPavilion(pab.code);
                onSelectLab('ALL'); // Reset lab selection when switching pavilion
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                isSelected
                  ? 'bg-brand-500/20 text-white shadow-sm ring-1 ring-brand-500/60'
                  : 'bg-surface-elevated hover:bg-surface-highlight text-foreground-muted hover:text-white'
              }`}
            >
              {pab.code === 'ALL' ? (
                <Layers className="w-4 h-4 text-brand-400" />
              ) : pab.code === 'Sin asignar' ? (
                <span className="w-5 h-5 rounded-lg bg-surface-highlight text-foreground-muted flex items-center justify-center text-[10px] font-bold">
                  ?
                </span>
              ) : (
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isSelected ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-highlight text-brand-400'
                }`}>
                  {pab.code}
                </span>
              )}

              <span>{pab.label}</span>

              {/* Conteo de equipos (Minimalista, sin borde blanco) */}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                isSelected ? 'bg-brand-500 text-white' : 'bg-surface-highlight text-foreground-muted'
              }`}>
                {stats.deviceCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* NIVEL 2: LABORATORIOS DEL PABELLÓN (Sub-barra de Aulas) */}
      {visibleLabs.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider mr-1">
              Laboratorios:
            </span>

            {/* Chip Todos los labs */}
            <button
              onClick={() => onSelectLab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 ${
                selectedLab === 'ALL'
                  ? 'bg-brand-500/20 text-brand-300 font-bold ring-1 ring-brand-500/50'
                  : 'bg-surface-elevated hover:bg-surface-highlight text-foreground-muted hover:text-white'
              }`}
            >
              Todos los laboratorios
            </button>

            {/* Chips por cada laboratorio (ej. VH101, VH102, VH203) */}
            {visibleLabs.map((lab) => {
              const isLabSelected = selectedLab === lab.code;
              return (
                <div key={lab.code} className="inline-flex items-center">
                  <button
                    onClick={() => onSelectLab(lab.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-medium transition ${
                      isLabSelected
                        ? 'bg-brand-500/25 text-white font-bold'
                        : 'bg-surface-elevated hover:bg-surface-highlight text-foreground-muted hover:text-white'
                    }`}
                  >
                    <span>{lab.code}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-brand-300 font-semibold tabular-nums">
                      {lab.deviceCount} eq.
                    </span>
                  </button>

                  {/* Botón rápido: Seleccionar todo este laboratorio */}
                  <button
                    onClick={() => onSelectWholeLab(lab.code)}
                    className={`px-2 py-1.5 rounded-r-lg text-xs transition active:scale-95 flex items-center justify-center ${
                      isLabSelected
                        ? 'bg-brand-500/40 text-white hover:bg-brand-500/60'
                        : 'bg-surface-elevated hover:bg-brand-500/20 text-foreground-subtle hover:text-brand-300'
                    }`}
                    title={`Marcar todos los ${lab.deviceCount} equipos del laboratorio ${lab.code}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                  </button>
                </div>
              );
            })}
            {/* Botón para eliminar el laboratorio seleccionado */}
            {selectedLab !== 'ALL' && onDeleteLab && (
              <button
                type="button"
                onClick={() => onDeleteLab(selectedLab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition active:scale-95 ml-auto shadow-sm"
                title={`Eliminar todos los registros del laboratorio ${selectedLab}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Eliminar Laboratorio {selectedLab}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
