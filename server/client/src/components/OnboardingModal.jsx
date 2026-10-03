import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Shield, 
  Monitor, 
  CheckSquare, 
  Globe, 
  Zap 
} from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: '¡Bienvenido al Panel de Control!',
    description: 'Desde aquí puedes decidir qué páginas web están permitidas en las computadoras de tu sala u oficina sin necesidad de tocar cada máquina.',
    tip: 'Todos los cambios se envían automáticamente por la red local sin interrumpir el trabajo de las personas.',
    icon: Shield,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10'
  },
  {
    step: 2,
    title: 'Conectar tus computadoras',
    description: 'Solo ejecuta el archivo del agente en la computadora que quieres gestionar (por ejemplo, en VH102-01). Aparecerá automáticamente en esta lista en menos de un minuto.',
    tip: 'No requiere instalar programas pesados; se ejecuta como un servicio ligero en segundo plano.',
    icon: Monitor,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    step: 3,
    title: 'Elegir a quién aplicar restricciones',
    description: 'Marca las casillas de las computadoras que deseas proteger (puedes elegir una sola, varias o todas a la vez).',
    tip: 'Si seleccionas varias máquinas, podrás aplicar las mismas reglas a todo el grupo con un solo clic.',
    icon: CheckSquare,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10'
  },
  {
    step: 4,
    title: 'Seleccionar o agregar páginas',
    description: 'Usa los botones rápidos para bloquear páginas comunes (como Facebook o YouTube) con un solo clic, o escribe la dirección que quieras bloquear.',
    tip: 'Ejemplos: youtube.com, tiktok.com, o youtube.com/shorts para bloquear solo los videos cortos.',
    icon: Globe,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    step: 5,
    title: 'Guardar y listo',
    description: 'Haz clic en "Aplicar cambios". En pocos segundos, los navegadores de esas computadoras bloquearán el acceso de inmediato.',
    tip: 'Funciona para Google Chrome, Microsoft Edge, Mozilla Firefox y Opera.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 md:p-8 animate-scale-in">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-foreground-subtle hover:text-foreground hover:bg-surface-highlight rounded-lg transition"
          aria-label="Cerrar guía"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-1.5 mb-6">
          {ONBOARDING_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-8 bg-brand-400'
                  : idx < currentStepIndex
                  ? 'w-4 bg-brand-500/40'
                  : 'w-4 bg-border'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-foreground-subtle font-medium">
            Paso {currentStepIndex + 1} de {ONBOARDING_STEPS.length}
          </span>
        </div>

        {/* Icono del paso actual */}
        <div className={`w-14 h-14 rounded-2xl ${current.bg} flex items-center justify-center mb-5 border border-border`}>
          <IconComponent className={`w-7 h-7 ${current.color}`} />
        </div>

        {/* Contenido textual sin tecnicismos */}
        <h2 className="text-xl font-bold text-white mb-3">
          {current.title}
        </h2>
        <p className="text-foreground text-sm leading-relaxed mb-4">
          {current.description}
        </p>

        {/* Consejo contextual */}
        <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs text-foreground-muted mb-6 leading-relaxed">
          <span className="font-semibold text-brand-400 mr-1.5">💡 Recuerda:</span>
          {current.tip}
        </div>

        {/* Controles de navegación */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition ${
              isFirst
                ? 'opacity-0 pointer-events-none'
                : 'text-foreground-muted hover:text-white hover:bg-surface-highlight'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition shadow-lg shadow-brand-500/20 active:scale-95"
          >
            <span>{isLast ? '¡Entendido, comenzar!' : 'Siguiente paso'}</span>
            {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
