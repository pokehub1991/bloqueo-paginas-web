import React from 'react';
import { ShieldCheck, HelpCircle, Monitor, Laptop, Sparkles, Terminal } from 'lucide-react';

export default function Hero({ 
  totalDevices = 0, 
  onlineDevices = 0, 
  totalBlockedRules = 0,
  onOpenOnboarding,
  onOpenAgentGuide,
  onSeedDemo,
  isSeeding = false 
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface border border-border p-6 md:p-8 shadow-xl shadow-black/20">
      {/* Luz ambiental sutil de fondo */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Título y descripción en lenguaje natural */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Panel de Protección Local</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
            Centro de Control de Navegación
          </h1>
          <p className="text-foreground-muted text-sm md:text-base leading-relaxed">
            Decide qué sitios web pueden abrirse en las computadoras de tu sala u oficina. 
            Las restricciones se aplican de forma inmediata en los navegadores de cada equipo sin necesidad de configurarlos uno por uno.
          </p>

          {/* Resumen en lenguaje cotidiano */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${onlineDevices > 0 ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${onlineDevices > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              </span>
              <span className="font-semibold text-white">{onlineDevices}</span>
              <span className="text-foreground-muted">
                {onlineDevices === 1 ? 'computadora conectada hoy' : 'computadoras conectadas hoy'}
              </span>
              {totalDevices > onlineDevices && (
                <span className="text-foreground-subtle text-xs">({totalDevices} registradas)</span>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-foreground">
              <span className="font-semibold text-brand-400">{totalBlockedRules}</span>
              <span className="text-foreground-muted">
                {totalBlockedRules === 1 ? 'página restringida activamente' : 'páginas restringidas activamente'}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción directa */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <button
            onClick={onOpenOnboarding}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition shadow-lg shadow-brand-500/20 active:scale-95"
            title="Aprende cómo funciona el sistema paso a paso"
          >
            <HelpCircle className="w-4 h-4" />
            <span>¿Cómo funciona esto?</span>
          </button>

          <button
            onClick={onOpenAgentGuide}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground hover:text-white font-medium text-sm transition active:scale-95"
          >
            <Terminal className="w-4 h-4 text-brand-400" />
            <span>Conectar una computadora</span>
          </button>

          {totalDevices === 0 && (
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight border border-dashed border-border-strong text-foreground-muted hover:text-white text-xs transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSeeding ? 'Cargando...' : 'Cargar computadoras de prueba'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
