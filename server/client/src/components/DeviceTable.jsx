import React, { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, 
  Server, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Ban,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Pencil,
  Check,
  X,
  Lock,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { formatRelativeTime } from '../lib/api';

const PAGE_SIZE = 50;

export default function DeviceTable({
  devices = [],
  selectedHostnames = [],
  onToggleSelect,
  onSelectAll,
  onRefresh,
  onDeleteDevice,
  onDeleteSelected,
  onRenameDevice,
  isLoading = false,
  totalOnline = 0,
  pavilionsCount = 0,
  totalRulesCount = 0
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingHostname, setEditingHostname] = useState(null);
  const [newHostnameValue, setNewHostnameValue] = useState('');

  // Reiniciar a página 1 si el filtrado cambia la cantidad
  useEffect(() => {
    setCurrentPage(1);
  }, [devices.length]);

  // Ordenar equipos limpiamente: primero en línea, luego por orden alfanumérico natural del Host
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.hostname.localeCompare(b.hostname, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [devices]);

  const totalPages = Math.ceil(sortedDevices.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, sortedDevices.length);
  const paginatedDevices = sortedDevices.slice(startIndex, endIndex);

  const allVisibleSelected = paginatedDevices.length > 0 && paginatedDevices.every(d => selectedHostnames.includes(d.hostname));
  const someVisibleSelected = paginatedDevices.some(d => selectedHostnames.includes(d.hostname)) && !allVisibleSelected;

  const handleSelectPage = () => {
    if (allVisibleSelected) {
      // Desmarcar los de la página actual
      const pageHostnames = paginatedDevices.map(d => d.hostname);
      onSelectAll(selectedHostnames.filter(h => !pageHostnames.includes(h)));
    } else {
      // Marcar los de la página actual
      const pageHostnames = paginatedDevices.map(d => d.hostname);
      onSelectAll(Array.from(new Set([...selectedHostnames, ...pageHostnames])));
    }
  };

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 overflow-hidden flex flex-col">
      {/* Encabezado superior de la tabla */}
      <div className="p-4 md:px-5 md:py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/40">
        <div>
          <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
            <span>Equipos de Cómputo</span>
          </h2>
          <p className="text-xs text-foreground-muted">
            {devices.length === 1 ? '1 equipo registrado' : `${devices.length} equipos registrados`}
            {selectedHostnames.length > 0 && (
              <span className="text-brand-400 font-semibold ml-1.5">
                · {selectedHostnames.length} seleccionado(s)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de eliminación en lote si hay equipos seleccionados */}
          {selectedHostnames.length > 0 && onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              title="Eliminar equipos seleccionados del registro"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Eliminar ({selectedHostnames.length})</span>
            </button>
          )}

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
      </div>

      {/* Contenido de la tabla */}
      {devices.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border text-foreground-subtle flex items-center justify-center mx-auto mb-3">
            <Monitor className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            No hay equipos registrados en este laboratorio
          </h3>
          <p className="text-xs text-foreground-muted max-w-md mx-auto mb-4">
            Ejecuta el archivo <code className="text-brand-400 bg-surface-elevated px-1.5 py-0.5 rounded font-mono">agent.bat</code> en cualquier computadora del Campus Villa para que aparezca aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs table-auto">
            {/* Cabeceras limpias sin iconos de ayuda ni signos de interrogación */}
            <thead className="bg-surface-elevated/80 text-foreground-muted uppercase font-semibold tracking-wider border-b border-border text-[11px]">
              <tr>
                {/* Checkbox de página */}
                <th className="py-3.5 px-3 w-10 text-center align-middle">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={handleSelectPage}
                      className="p-1 hover:text-white transition cursor-pointer"
                      title={allVisibleSelected ? 'Deseleccionar página' : 'Seleccionar página'}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand-400" />
                      ) : someVisibleSelected ? (
                        <div className="w-4 h-4 rounded bg-brand-400/30 border border-brand-400 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-brand-400" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-foreground-subtle" />
                      )}
                    </button>
                  </div>
                </th>

                {/* 1. ESTADO */}
                <th className="py-3.5 px-3 w-16 text-center align-middle">
                  <span>ESTADO</span>
                </th>

                {/* 2. HOST */}
                <th className="py-3.5 px-4 min-w-[160px] text-center align-middle">
                  <span>HOST</span>
                </th>

                {/* 3. IP */}
                <th className="py-3.5 px-3 w-28 whitespace-nowrap text-center align-middle">
                  <span>IP</span>
                </th>

                {/* 4. REGLAS DE NAVEGACIÓN */}
                <th className="py-3.5 px-4 min-w-[200px] text-center align-middle">
                  <span>REGLAS DE NAVEGACIÓN</span>
                </th>

                {/* 5. ÚLTIMO PULSO */}
                <th className="py-3.5 px-4 min-w-[140px] text-center align-middle">
                  <span>ÚLTIMO PULSO</span>
                </th>

                {/* 6. ACCIÓN ELIMINAR */}
                <th className="py-3.5 px-3 w-12 text-center align-middle">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {paginatedDevices.map((device) => {
                const isSelected = selectedHostnames.includes(device.hostname);
                const policyMode = device.policyMode || 'block_list';
                const blockedList = device.blockedUrls || [];
                const allowedList = device.allowedUrls || [];

                return (
                  <tr
                    key={device.hostname}
                    onClick={() => onToggleSelect(device.hostname)}
                    className={`transition-all duration-150 cursor-pointer select-none group/row ${
                      isSelected 
                        ? 'bg-brand-500/20 hover:bg-brand-500/25 shadow-[inset_4px_0_0_0_#0ea5e9]' 
                        : 'hover:bg-surface-highlight/60 hover:shadow-[inset_3px_0_0_0_#38bdf8]'
                    }`}
                  >
                    {/* Checkbox de selección */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <div className="flex items-center justify-center">
                        <div
                          className="p-1 pointer-events-none transition"
                          title={isSelected ? 'Deseleccionar equipo' : 'Seleccionar equipo'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-400" />
                          ) : (
                            <Square className="w-4 h-4 text-foreground-subtle" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 1. ESTADO: Punto indicador minimalista sin anillos gruesos */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <div className="flex items-center justify-center">
                        {device.isOnline ? (
                          <span 
                            className="relative flex h-2.5 w-2.5"
                            title="Equipo en línea (Conectado y sincronizando)"
                          >
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                          </span>
                        ) : (
                          <span 
                            className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-600"
                            title="Equipo inactivo (Sin respuesta en los últimos 90 segundos)"
                          ></span>
                        )}
                      </div>
                    </td>

                    {/* 2. HOST: Nombre limpio con opción de renombrar inline */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="flex flex-col justify-center items-center">
                        {editingHostname === device.hostname ? (
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={newHostnameValue}
                              onChange={(e) => setNewHostnameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (onRenameDevice) onRenameDevice(device.hostname, newHostnameValue);
                                  setEditingHostname(null);
                                } else if (e.key === 'Escape') {
                                  setEditingHostname(null);
                                }
                              }}
                              className="bg-surface-elevated border border-brand-500 rounded-lg px-2 py-0.5 text-xs text-white font-mono uppercase font-bold outline-none w-36 shadow-md text-center"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (onRenameDevice) onRenameDevice(device.hostname, newHostnameValue);
                                setEditingHostname(null);
                              }}
                              className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer"
                              title="Guardar nombre"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingHostname(null)}
                              className="p-1 rounded bg-surface hover:bg-surface-highlight text-foreground-muted hover:text-white transition cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 group/host">
                            <span className="font-bold text-white text-sm tracking-wide group-hover/row:text-brand-300 transition-colors">
                              {device.hostname}
                            </span>
                            {onRenameDevice && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingHostname(device.hostname);
                                  setNewHostnameValue(device.hostname);
                                }}
                                className="opacity-0 group-hover/host:opacity-100 p-1 rounded-md hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 transition cursor-pointer"
                                title="Cambiar / Renombrar nombre de este equipo"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-foreground-subtle tracking-normal">
                            {device.os || 'Windows 11'}
                          </span>
                          {device.identityPolicy?.blockGoogleLogin && (
                            <span className="p-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Logins de Google bloqueados">
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {device.identityPolicy?.blockIncognito && (
                            <span className="p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Modo Incógnito restringido">
                              <EyeOff className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {device.identityPolicy?.clearSessionOnClose && (
                            <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Limpieza automática de cuentas al salir">
                              <Sparkles className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. IP */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-center align-middle">
                      <div className="flex items-center justify-center">
                        <span className="font-mono tabular-nums text-xs text-foreground bg-surface-elevated group-hover/row:bg-surface-elevated/90 group-hover/row:border-border-strong border border-border/40 px-2.5 py-1 rounded-lg transition-all">
                          {device.ip}
                        </span>
                      </div>
                    </td>

                    {/* 4. REGLAS */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center group-hover/row:scale-[1.02] transition-transform">
                        {policyMode === 'block_all' ? (
                          <div className="relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
                            <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Bloquear todo</span>
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 bg-surface-elevated border border-border-strong text-[11px] text-rose-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition z-50 text-left">
                              Toda navegación web está inhabilitada en este equipo.
                            </span>
                          </div>
                        ) : policyMode === 'allow_list' ? (
                          <div className="relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Permitir lista ({allowedList.length})</span>
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 bg-surface-elevated border border-border-strong text-[11px] text-emerald-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition z-50 text-left">
                              <strong className="block text-white mb-1 border-b border-border pb-1">Sitios Autorizados:</strong>
                              {allowedList.length > 0 ? (
                                <span className="break-words leading-relaxed">{allowedList.join(', ')}</span>
                              ) : (
                                <span className="italic text-foreground-subtle">Sin sitios definidos (bloqueo total)</span>
                              )}
                            </span>
                          </div>
                        ) : policyMode === 'block_list' && blockedList.length > 0 ? (
                          <div className="relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Bloquear lista ({blockedList.length})</span>
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 bg-surface-elevated border border-border-strong text-[11px] text-amber-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition z-50 text-left">
                              <strong className="block text-white mb-1 border-b border-border pb-1">Sitios Restringidos:</strong>
                              <span className="break-words leading-relaxed">{blockedList.join(', ')}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-foreground-muted font-medium">
                            <Globe className="w-3.5 h-3.5 text-foreground-subtle" />
                            <span>Navegación libre</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. ÚLTIMO PULSO */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center align-middle">
                      <div className="flex items-center justify-center">
                        <span
                          className="text-foreground-muted text-xs"
                          title={device.lastSeen ? `Última sincronización: ${device.lastSeen}` : ''}
                        >
                          {formatRelativeTime(device.lastSeen)}
                        </span>
                      </div>
                    </td>

                    {/* 6. BOTÓN ELIMINAR INDIVIDUAL */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <div className="flex items-center justify-center">
                        {onDeleteDevice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDevice(device.hostname);
                            }}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-foreground-subtle hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer"
                            title={`Eliminar ${device.hostname} del registro`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PIE DE PÁGINA DE LA TABLA: Componentes de métricas (Hero) + Paginación (Máximo 50 por página) */}
      <div className="p-4 md:px-5 border-t border-border bg-surface-elevated/30 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
        {/* Métricas resumidas de Hero */}
        <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated text-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-white tabular-nums">{totalOnline}</span>
            <span className="text-foreground-muted">en línea</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated text-foreground">
            <Monitor className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-semibold text-white tabular-nums">{devices.length}</span>
            <span className="text-foreground-muted">registrados</span>
          </div>

          {pavilionsCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated text-foreground">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-semibold text-white tabular-nums">{pavilionsCount}</span>
              <span className="text-foreground-muted">pabellones</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated text-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white tabular-nums">{totalRulesCount}</span>
            <span className="text-foreground-muted">reglas</span>
          </div>
        </div>

        {/* Paginación (Máx 50 por página) */}
        {devices.length > 0 && (
          <div className="flex items-center gap-3 self-end md:self-auto text-xs">
            <span className="text-foreground-muted">
              Mostrando <strong className="text-white">{startIndex + 1}</strong> - <strong className="text-white">{endIndex}</strong> de <strong className="text-white">{devices.length}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-highlight border border-border text-foreground hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-foreground font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-highlight border border-border text-foreground hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
