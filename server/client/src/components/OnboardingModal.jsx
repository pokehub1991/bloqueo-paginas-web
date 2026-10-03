import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Shield, 
  Monitor, 
  Building2, 
  Layers, 
  Zap 
} from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: '¡Bienvenido al Control de Laboratorios!',
    description: 'Desde aquí decides qué páginas web están permitidas en las computadoras de los laboratorios de cómputo universitarios sin necesidad de configurar cada máquina individualmente.',
    tip: 'Todos los cambios se aplican automáticamente por la red del campus en los navegadores de cada equipo.',
    icon: Shield,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10'
  },
  {
    step: 2,
    title: 'Detección por Pabellón y Laboratorio',
    description: 'Al ejecutar el agente en un equipo (por ejemplo: VH102-01), el sistema detecta de forma automática que pertenece al Laboratorio VH102 del Pabellón H.',
    tip: 'No requiere instalaciones pesadas; se ejecuta con un script ligero en segundo plano.',
    icon: Building2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    step: 3,
    title: 'Filtra por Pabellón y selecciona equipos',
    description: 'Usa los chips de pabellones en la parte superior para centrarte en un laboratorio específico. Marca las casillas de las computadoras que deseas configurar.',
    tip: 'Puedes seleccionar un equipo, varios equipos o todo el laboratorio a la vez.',
    icon: Layers,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10'
  },
  {
    step: 4,
    title: 'Los 3 Modos de Control de Navegación',
    description: 'Tienes a tu disposición 3 modalidades según la actividad académica: "Bloquear todo" (ideal para exámenes), "Permitir lista" (solo recursos de clase) o "Bloquear lista" (restringir redes sociales o juegos).',
    tip: 'Las páginas que agregues se mantendrán guardadas de forma persistente y no se borrarán las anteriores.',
    icon: Monitor,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10'
  },
  {
    step: 5,
    title: 'Guardar y listo',
    description: 'Haz clic en "Aplicar". En pocos segundos, Google Chrome, Microsoft Edge, Mozilla Firefox y Opera aplicarán las directivas de inmediato.',
    tip: 'Puedes volver a esta guía en cualquier momento haciendo clic en "¿Cómo funciona esto?".',
    icon: Zap,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10'
  }
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const current = ONBOARDING_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const IconComponent = current.icon;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('web_blocker_tour_seen', 'true');
      onClose();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 md:p-8 animate-scale-in">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-foreground-subtle hover:text-white hover:bg-surface-highlight rounded-lg transition"
          aria-label="Cerrar guía"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-1.5 mb-6">
          {ONBOARDING_STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-8 bg-brand-500'
                  : idx < currentStepIndex
                  ? 'w-4 bg-brand-500/40'
                  : 'w-4 bg-surface-elevated'
              }`}
            />
          ))}
        </div>

        {/* Contenido del paso actual */}
        <div className="mb-8">
          <div className="flex items-center gap-3.5 mb-4">
            <div className={`w-12 h-12 rounded-2xl ${current.bg} ${current.color} flex items-center justify-center border border-current/20`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">
                Paso {current.step} de {ONBOARDING_STEPS.length}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {current.title}
              </h2>
            </div>
          </div>

          <p className="text-foreground-muted text-sm leading-relaxed mb-4">
            {current.description}
          </p>

          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs text-foreground flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
            <span className="leading-relaxed">{current.tip}</span>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition ${
              isFirst
                ? 'opacity-0 pointer-events-none'
                : 'text-foreground-muted hover:text-white hover:bg-surface-highlight'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition active:scale-95 shadow-lg shadow-brand-500/20"
          >
            <span>{isLast ? '¡Empezar a gestionar!' : 'Siguiente'}</span>
            {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
