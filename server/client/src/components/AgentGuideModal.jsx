import React, { useState } from 'react';
import { X, Terminal, Copy, Check, ExternalLink, ShieldCheck, Laptop, AlertCircle } from 'lucide-react';

export default function AgentGuideModal({
  isOpen,
  onClose,
  systemInfo = {}
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const serverUrl = systemInfo.recommendedUrl || 'http://192.168.1.X:3000';
  const configLine = `ServerUrl = ${serverUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(configLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl p-6 md:p-8 animate-scale-in">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-foreground-subtle hover:text-foreground hover:bg-surface-highlight rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Conectar una Computadora Windows
            </h2>
            <p className="text-xs text-foreground-muted">
              Sigue estos 3 sencillos pasos en la máquina que deseas controlar.
            </p>
          </div>
        </div>

        {/* Pasos */}
        <div className="space-y-4 mb-6">
          {/* Paso 1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-elevated border border-border">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="text-xs">
              <span className="font-semibold text-white block mb-0.5">
                Copiar la carpeta del agente
              </span>
              <span className="text-foreground-muted">
                Copia la carpeta <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded">agent</code> en la computadora que quieres proteger (puedes transferirla por memoria USB o carpeta compartida).
              </span>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-elevated border border-border">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="text-xs w-full">
              <span className="font-semibold text-white block mb-0.5">
                Verificar la dirección en config.ini
              </span>
              <span className="text-foreground-muted block mb-2">
                Abre el archivo <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded">config.ini</code> con el Bloc de Notas y verifica que tenga la dirección de este servidor:
              </span>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border font-mono text-brand-400 text-xs">
                <span>{configLine}</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-elevated hover:bg-surface-highlight text-white text-[11px] transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-elevated border border-border">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div className="text-xs">
              <span className="font-semibold text-white block mb-0.5">
                Iniciar el agente
              </span>
              <span className="text-foreground-muted">
                Haz clic derecho sobre <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded">agent.bat</code> y selecciona <strong className="text-white">"Ejecutar como Administrador"</strong>. La computadora aparecerá en el panel en segundos.
              </span>
            </div>
          </div>
        </div>

        {/* Nota de compatibilidad */}
        <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border text-[11px] text-foreground-muted flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Compatible con Google Chrome, Microsoft Edge, Mozilla Firefox y Opera sin necesidad de instalar extensiones ni certificados en los navegadores.
          </span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
