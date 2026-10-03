import React from 'react';
import { 
  Monitor, 
  Server, 
  Laptop, 
  Trash2, 
  Unlock, 
  SlidersHorizontal, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Square,
  RefreshCw,
  Plus
} from 'lucide-react';
import { formatRelativeTime } from '../lib/api';

export default function DeviceTable({
  devices = [],
  selectedHostnames = [],
  onToggleSelect,
  onSelectAll,
  onOpenEditRules,
  onUnblockSingle,
  onDeleteDevice,
  onRefresh,
  isLoading = false
}) {
  const allSelected = devices.length > 0 && selectedHostnames.length === devices.length;
  const someSelected = selectedHostnames.length > 0 && !allSelected;

  const getDeviceIcon = (hostname, os) => {
    if (hostname.toLowerCase().includes('serv') || (os && os.toLowerCase().includes('server'))) {
      return <Server className="w-4 h-4 text-indigo-400" />;
    }
    return <Monitor className="w-4 h-4 text-brand-400" />;
  };

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 overflow-hidden">
      {/* Encabezado de la tabla */}
      <div className="p-4 md:px-6 md:py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Computadoras en la Red Local
          </h2>
          <p className="text-xs text-foreground-muted">
            Lista de equipos detectados automáticamente por el agente.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white text-xs font-medium transition active:scale-95 disabled:opacity-50"
          title="Actualizar lista de equipos"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Contenido de la tabla */}
      {devices.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border text-foreground-subtle flex items-center justify-center mx-auto mb-3">
            <Monitor className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            No hay computadoras registradas aún
          </h3>
          <p className="text-xs text-foreground-muted max-w-md mx-auto mb-4">
            Ejecuta el archivo <code className="text-brand-400 bg-surface-elevated px-1.5 py-0.5 rounded">agent.bat</code> en cualquier computadora de tu red para que aparezca aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated/60 text-foreground-muted uppercase font-medium tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={onSelectAll}
                    className="p-1 hover:text-white transition"
                    title={allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-400" />
                    ) : someSelected ? (
                      <div className="w-4 h-4 rounded bg-brand-400/30 border border-brand-400 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-brand-400" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-foreground-subtle" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Nombre del equipo</th>
                <th className="py-3 px-4">Dirección en red</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Reglas de navegación aplicada</th>
                <th className="py-3 px-4">Última vez visto</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {devices.map((device) => {
                const isSelected = selectedHostnames.includes(device.hostname);
                const hasRules = device.blockedUrls && device.blockedUrls.length > 0;

                return (
                  <tr
                    key={device.hostname}
                    className={`transition-colors hover:bg-surface-elevated/40 ${
                      isSelected ? 'bg-brand-500/5' : ''
                    }`}
                  >
                    {/* Checkbox de selección */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onToggleSelect(device.hostname)}
                        className="p-1 hover:text-white transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-400" />
                        ) : (
                          <Square className="w-4 h-4 text-foreground-subtle" />
                        )}
                      </button>
                    </td>

                    {/* Nombre del equipo */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-surface-elevated border border-border">
                          {getDeviceIcon(device.hostname, device.os)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {device.hostname}
                          </div>
                          <div className="text-[11px] text-foreground-subtle">
                            {device.os || 'Windows'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dirección en red (IP) */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-foreground-muted bg-surface-elevated px-2 py-0.5 rounded text-[11px] border border-border">
                        {device.ip}
                      </span>
                    </td>

                    {/* Estado de conexión en lenguaje natural */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {device.isOnline && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              device.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          ></span>
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            device.isOnline ? 'text-emerald-400' : 'text-foreground-subtle'
                          }`}
                        >
                          {device.isOnline ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                    </td>

                    {/* Páginas bloqueadas / Reglas aplicadas */}
                    <td className="py-3.5 px-4">
                      {hasRules ? (
                        <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-[11px]">
                            <ShieldAlert className="w-3 h-3" />
                            {device.blockedUrls.length}{' '}
                            {device.blockedUrls.length === 1 ? 'bloqueada' : 'bloqueadas'}
                          </span>
                          {device.blockedUrls.slice(0, 3).map((url, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[11px] text-foreground-muted truncate max-w-[120px]"
                              title={url}
                            >
                              {url}
                            </span>
                          ))}
                          {device.blockedUrls.length > 3 && (
                            <span className="text-[11px] text-foreground-subtle">
                              +{device.blockedUrls.length - 3} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400/90 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Navegación libre</span>
                        </span>
                      )}
                    </td>

                    {/* Última vez visto */}
                    <td className="py-3.5 px-4 text-foreground-muted">
                      {formatRelativeTime(device.lastSeen)}
                    </td>

                    {/* Acciones por equipo */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenEditRules(device)}
                          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-brand-400 transition"
                          title="Gestionar reglas de este equipo"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {hasRules && (
                          <button
                            onClick={() => onUnblockSingle(device.hostname)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-emerald-500/20 border border-border text-foreground-muted hover:text-emerald-400 transition"
                            title="Quitar restricciones a este equipo"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteDevice(device.hostname)}
                          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-rose-500/20 border border-border text-foreground-muted hover:text-rose-400 transition"
                          title="Eliminar este equipo del panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
