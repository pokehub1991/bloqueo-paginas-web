import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  EyeOff, 
  Trash2, 
  HelpCircle, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Laptop, 
  Sparkles,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
  Download
} from 'lucide-react';
import { formatRelativeTime } from '../lib/api';

const PAGE_SIZE = 50;

export default function IdentitySecurityView({
  devices = [],
  selectedHostnames = [],
  onToggleSelect,
  onSelectAll,
  onRefresh,
  onApplyIdentityPolicies,
  onForceLogout,
  isLoading = false,
  totalOnline = 0
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Estados de los Master Toggles globales (para aplicar a los seleccionados o a todos)
  const [masterGoogleBlock, setMasterGoogleBlock] = useState(false);
  const [masterAllowedDomains, setMasterAllowedDomains] = useState('upc.edu.pe');
  const [masterBlockIncognito, setMasterBlockIncognito] = useState(false);
  const [masterClearOnClose, setMasterClearOnClose] = useState(false);

  // Modal de confirmación para cierre forzado de sesión
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const downloadPolicyReg = () => {
    const regContent = `Windows Registry Editor Version 5.00

; ==============================================================
; UPC NetShield - Bloqueo de Modo Incógnito y Cuentas de Google
; Inhabilita la navegación privada y el inicio de sesión de perfil
; ==============================================================

; 1. Google Chrome
[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome]
"IncognitoModeAvailability"=dword:00000001
"BrowserSignin"=dword:00000000
"SyncDisabled"=dword:00000001
"SigninAllowed"=dword:00000000
"XGoogleAllowedDomains"="upc.edu.pe"

; 2. Microsoft Edge
[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge]
"IncognitoModeAvailability"=dword:00000001
"BrowserSignin"=dword:00000000
"SyncDisabled"=dword:00000001

; 3. Brave Browser
[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\BraveSoftware\\Brave]
"IncognitoModeAvailability"=dword:00000001
"SyncDisabled"=dword:00000001

; 4. Mozilla Firefox
[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Mozilla\\Firefox]
"DisablePrivateBrowsing"=dword:00000001
`;
    const blob = new Blob([regContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bloquear_cuentas_e_incognito.reg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Estadísticas dinámicas de identidad
  const stats = useMemo(() => {
    let googleBlocked = 0;
    let incognitoBlocked = 0;
    let clearOnClose = 0;
    let domainRestricted = 0;

    for (const d of devices) {
      const pol = d.identityPolicy || {};
      if (pol.blockGoogleLogin) googleBlocked++;
      if (pol.blockIncognito) incognitoBlocked++;
      if (pol.clearSessionOnClose) clearOnClose++;
      if (pol.allowedGoogleDomains && pol.allowedGoogleDomains.trim()) domainRestricted++;
    }

    return {
      total: devices.length,
      online: totalOnline,
      googleBlocked,
      incognitoBlocked,
      clearOnClose,
      domainRestricted
    };
  }, [devices, totalOnline]);

  // Filtrado y búsqueda optimizada (búsqueda con debounce visual)
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices;
    const query = searchQuery.toLowerCase().trim();
    return devices.filter(d => 
      d.hostname.toLowerCase().includes(query) ||
      (d.ip && d.ip.includes(query)) ||
      (d.laboratory && d.laboratory.toLowerCase().includes(query)) ||
      (d.pavilion && d.pavilion.toLowerCase().includes(query))
    );
  }, [devices, searchQuery]);

  // Paginación eficiente para soportar fluidamente +1,000 equipos
  const totalPages = Math.ceil(filteredDevices.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredDevices.length);
  const paginatedDevices = useMemo(() => {
    return filteredDevices.slice(startIndex, endIndex);
  }, [filteredDevices, startIndex, endIndex]);

  const allVisibleSelected = paginatedDevices.length > 0 && paginatedDevices.every(d => selectedHostnames.includes(d.hostname));

  const handleSelectPage = () => {
    if (allVisibleSelected) {
      const pageHostnames = paginatedDevices.map(d => d.hostname);
      onSelectAll(selectedHostnames.filter(h => !pageHostnames.includes(h)));
    } else {
      const pageHostnames = paginatedDevices.map(d => d.hostname);
      onSelectAll(Array.from(new Set([...selectedHostnames, ...pageHostnames])));
    }
  };

  const handleApplyMasterToggle = (policyKey, value) => {
    const targets = selectedHostnames.length > 0 
      ? selectedHostnames 
      : filteredDevices.map(d => d.hostname);

    if (targets.length === 0) return;

    onApplyIdentityPolicies({
      hostnames: targets,
      [policyKey]: value
    });
  };

  const handleEmergencyFlushConfirm = async () => {
    const targets = selectedHostnames.length > 0 ? selectedHostnames : [];
    await onForceLogout(targets);
    setShowConfirmLogout(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. HERO DEL MÓDULO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface to-surface-elevated border border-border/80 p-5 md:p-6 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protección Institucional de Identidad</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Seguridad de Cuentas y Privacidad de Aulas</span>
            </h1>
            <p className="text-xs md:text-sm text-foreground-muted max-w-2xl leading-relaxed">
              Evita que alumnos o docentes dejen correos de Gmail, Drive o cuentas personales abiertas en las computadoras compartidas del laboratorio, protegiendo su información frente a suplantaciones.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowTutorialModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-white text-xs font-semibold transition active:scale-95 shadow-md shadow-black/30 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-brand-400" />
              <span>¿Cómo funciona esto?</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Refrescar estado"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Métricas rápidas de escala empresarial (+1,000 equipos) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/40">
          <div className="p-3 rounded-xl bg-surface/60 border border-border/50">
            <div className="text-[11px] text-foreground-muted font-medium flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>Equipos en red</span>
            </div>
            <div className="text-lg md:text-xl font-extrabold text-white mt-1">
              {stats.total.toLocaleString()}
              <span className="text-xs font-semibold text-emerald-400 ml-1.5">
                ({stats.online} activos)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/60 border border-border/50">
            <div className="text-[11px] text-foreground-muted font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Logins bloqueados</span>
            </div>
            <div className="text-lg md:text-xl font-extrabold text-white mt-1">
              {stats.googleBlocked.toLocaleString()}
              <span className="text-xs font-medium text-foreground-muted ml-1.5">
                máquinas
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/60 border border-border/50">
            <div className="text-[11px] text-foreground-muted font-medium flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Incógnito restringido</span>
            </div>
            <div className="text-lg md:text-xl font-extrabold text-white mt-1">
              {stats.incognitoBlocked.toLocaleString()}
              <span className="text-xs font-medium text-foreground-muted ml-1.5">
                máquinas
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/60 border border-border/50">
            <div className="text-[11px] text-foreground-muted font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Limpieza al salir</span>
            </div>
            <div className="text-lg md:text-xl font-extrabold text-white mt-1">
              {stats.clearOnClose.toLocaleString()}
              <span className="text-xs font-medium text-foreground-muted ml-1.5">
                máquinas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERRUPTORES RÁPIDOS GLOBALES (MASTER TOGGLES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Toggle 1: Impedir cuentas personales de Google */}
        <div className="p-4 rounded-xl bg-surface border border-border/70 hover:border-brand-500/40 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterGoogleBlock}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setMasterGoogleBlock(val);
                    handleApplyMasterToggle('blockGoogleLogin', val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
            <h3 className="text-xs md:text-sm font-bold text-white mb-1">
              Impedir inicio de sesión en Google
            </h3>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Evita que alumnos o docentes abran su correo personal de Gmail o Drive y lo dejen abierto en el equipo.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-foreground-muted flex items-center justify-between">
            <span>Aplica a: {selectedHostnames.length > 0 ? `${selectedHostnames.length} seleccionados` : 'Todos'}</span>
          </div>
        </div>

        {/* Toggle 2: Permitir solo correos institucionales */}
        <div className="p-4 rounded-xl bg-surface border border-border/70 hover:border-brand-500/40 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <button
                onClick={() => handleApplyMasterToggle('allowedGoogleDomains', masterAllowedDomains)}
                className="px-2.5 py-1 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold transition active:scale-95 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
            <h3 className="text-xs md:text-sm font-bold text-white mb-1">
              Permitir solo correos institucionales
            </h3>
            <p className="text-[11px] text-foreground-muted leading-relaxed mb-2">
              Permite únicamente cuentas oficiales (ej. @upc.edu.pe) y bloquea correos personales.
            </p>
            <div className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg border border-border">
              <span className="text-xs text-foreground-muted">@</span>
              <input
                type="text"
                value={masterAllowedDomains}
                onChange={(e) => setMasterAllowedDomains(e.target.value)}
                placeholder="upc.edu.pe"
                className="w-full bg-transparent text-xs text-white placeholder-foreground-muted focus:outline-none font-medium"
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-foreground-muted flex items-center justify-between">
            <span>Inyección de cabecera Workspace</span>
          </div>
        </div>

        {/* Toggle 3: Bloquear modo incógnito */}
        <div className="p-4 rounded-xl bg-surface border border-border/70 hover:border-brand-500/40 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <EyeOff className="w-4 h-4" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterBlockIncognito}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setMasterBlockIncognito(val);
                    handleApplyMasterToggle('blockIncognito', val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <h3 className="text-xs md:text-sm font-bold text-white mb-1">
              Bloquear modo incógnito
            </h3>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Impide que los alumnos abran ventanas privadas para ocultar su actividad de navegación en el aula.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-foreground-muted flex items-center justify-between">
            <span>Cierre automático de ventanas privadas</span>
          </div>
        </div>

        {/* Toggle 4: Limpiar cuentas al salir */}
        <div className="p-4 rounded-xl bg-surface border border-border/70 hover:border-brand-500/40 transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterClearOnClose}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setMasterClearOnClose(val);
                    handleApplyMasterToggle('clearSessionOnClose', val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <h3 className="text-xs md:text-sm font-bold text-white mb-1">
              Limpiar cuentas al salir
            </h3>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Borra contraseñas y cuentas temporales automáticamente cada vez que se cierra el navegador.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-foreground-muted flex items-center justify-between">
            <span>Purga de cookies y almacenamiento</span>
          </div>
        </div>
      </div>

      {/* 2.5 BANNER DE ARQUITECTURA DE PROTECCIÓN DUAL */}
      <div className="p-4 rounded-xl bg-surface border border-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/25 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
              Protección de Cuentas y Modo Incógnito (Doble Capa)
            </h4>
            <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5 max-w-3xl">
              1. <strong>Nivel Sistema / Navegador</strong>: Bloquea el botón de perfil superior de Chrome/Edge (evita iniciar sesión en la app y sincronizar cuentas personales) e inactiva el <strong>Modo Incógnito</strong> en el registro de Windows.<br/>
              2. <strong>Nivel Web</strong>: La extensión intercepta las páginas de login de Google en tiempo real e inyecta la cabecera institucional.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={downloadPolicyReg}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border hover:border-brand-500/50 text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
            title="Descargar archivo de registro para aplicar políticas de Windows"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>Descargar Directiva Windows (.reg)</span>
          </button>
        </div>
      </div>

      {/* 3. BARRA DE ACCIONES POR LOTES (BATCH ACTION BAR) */}
      {selectedHostnames.length > 0 && (
        <div className="p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-slide-down">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse"></span>
            <span className="text-xs font-bold text-white">
              {selectedHostnames.length} equipo(s) seleccionado(s)
            </span>
            <span className="text-[11px] text-foreground-muted hidden sm:inline">
              · Aplica acciones de seguridad masivas a la selección
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cerrar sesiones activas ahora (Emergency Flush) */}
            <button
              onClick={() => setShowConfirmLogout(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-rose-600/20 cursor-pointer"
              title="Cierra de golpe todos los correos y cuentas abiertas en estos equipos"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesiones activas ahora</span>
            </button>

            {/* Bloquear Logins */}
            <button
              onClick={() => handleApplyMasterToggle('blockGoogleLogin', true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Bloquear logins</span>
            </button>

            {/* Permitir Logins */}
            <button
              onClick={() => handleApplyMasterToggle('blockGoogleLogin', false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permitir logins</span>
            </button>

            {/* Bloquear Incógnito */}
            <button
              onClick={() => handleApplyMasterToggle('blockIncognito', true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Bloquear incógnito</span>
            </button>

            {/* Desmarcar todos */}
            <button
              onClick={() => onSelectAll([])}
              className="px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-foreground-muted text-xs transition cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* 4. TABLA DE EQUIPOS CON BÚSQUEDA Y CONTROLES POR FILA */}
      <div className="rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 overflow-hidden flex flex-col">
        {/* Cabecera con Buscador */}
        <div className="p-4 md:px-5 md:py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/40">
          <div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <span>Equipos y Políticas de Identidad</span>
            </h2>
            <p className="text-xs text-foreground-muted">
              Supervisión de cuentas en {filteredDevices.length} computadoras
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Buscador en tiempo real */}
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por equipo, IP o aula..."
                className="w-full bg-surface-elevated border border-border text-xs rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-foreground-muted focus:outline-none focus:border-brand-500/80 transition"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-elevated/60 text-foreground-muted font-bold tracking-wider text-[11px] uppercase">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleSelectPage}
                    className="rounded border-border bg-surface-elevated text-brand-500 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-3 px-4">Estación de Trabajo</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Inicio Sesión Google</th>
                <th className="py-3 px-4 text-center">Dominio Autorizado</th>
                <th className="py-3 px-4 text-center">Modo Incógnito</th>
                <th className="py-3 px-4 text-center">Limpiar al Salir</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-foreground-muted">
                    No se encontraron computadoras que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((d) => {
                  const isSelected = selectedHostnames.includes(d.hostname);
                  const pol = d.identityPolicy || {};

                  return (
                    <tr
                      key={d.hostname}
                      className={`hover:bg-surface-elevated/50 transition-colors ${
                        isSelected ? 'bg-brand-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(d.hostname)}
                          className="rounded border-border bg-surface-elevated text-brand-500 focus:ring-0 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Estación */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg border ${
                            d.isOnline 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-surface-elevated text-foreground-muted border-border'
                          }`}>
                            <Laptop className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{d.hostname}</span>
                              {d.laboratory && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-elevated text-foreground-muted font-normal">
                                  {d.laboratory}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-foreground-muted flex items-center gap-2">
                              <span>{d.ip}</span>
                              <span>·</span>
                              <span>{d.isOnline ? 'En línea' : formatRelativeTime(d.lastSeen)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.isOnline 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-surface-elevated text-foreground-muted border border-border'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
                          {d.isOnline ? 'Conectado' : 'Ausente'}
                        </span>
                      </td>

                      {/* Inicio Sesión Google */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onApplyIdentityPolicies({
                            hostnames: [d.hostname],
                            blockGoogleLogin: !pol.blockGoogleLogin
                          })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${
                            pol.blockGoogleLogin
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                              : 'bg-surface-elevated text-foreground-muted border-border hover:text-white'
                          }`}
                          title="Clic para alternar bloqueo de login"
                        >
                          {pol.blockGoogleLogin ? (
                            <>
                              <Lock className="w-3 h-3 text-rose-400" />
                              <span>Bloqueado</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-zinc-500" />
                              <span>Permitido</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Dominio Autorizado */}
                      <td className="py-3 px-4 text-center">
                        {pol.allowedGoogleDomains ? (
                          <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 border border-brand-500/30 text-[10px] font-semibold">
                            @{pol.allowedGoogleDomains}
                          </span>
                        ) : (
                          <span className="text-[11px] text-foreground-muted">Sin filtro</span>
                        )}
                      </td>

                      {/* Modo Incógnito */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onApplyIdentityPolicies({
                            hostnames: [d.hostname],
                            blockIncognito: !pol.blockIncognito
                          })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${
                            pol.blockIncognito
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                              : 'bg-surface-elevated text-foreground-muted border-border hover:text-white'
                          }`}
                          title="Clic para alternar bloqueo de incógnito"
                        >
                          {pol.blockIncognito ? (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-400" />
                              <span>Restringido</span>
                            </>
                          ) : (
                            <span>Libre</span>
                          )}
                        </button>
                      </td>

                      {/* Limpiar al Salir */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onApplyIdentityPolicies({
                            hostnames: [d.hostname],
                            clearSessionOnClose: !pol.clearSessionOnClose
                          })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${
                            pol.clearSessionOnClose
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-surface-elevated text-foreground-muted border-border hover:text-white'
                          }`}
                          title="Clic para alternar limpieza al cerrar"
                        >
                          {pol.clearSessionOnClose ? (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <span>Inactivo</span>
                          )}
                        </button>
                      </td>

                      {/* Acción individual: Cerrar sesión ahora */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onForceLogout([d.hostname])}
                          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-rose-500/20 text-foreground-muted hover:text-rose-400 border border-border hover:border-rose-500/30 transition active:scale-95 cursor-pointer"
                          title={`Cerrar sesiones activas en ${d.hostname}`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between bg-surface-elevated/40">
            <span className="text-xs text-foreground-muted">
              Página {currentPage} de {totalPages} ({filteredDevices.length} equipos en total)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-surface border border-border text-foreground hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-surface border border-border text-foreground hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ¿CÓMO FUNCIONA LA PROTECCIÓN DE CUENTAS? (TUTORIAL INTERACTIVO) */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Cómo funciona la protección de cuentas?</h3>
                  <p className="text-xs text-foreground-muted">Guía del sistema de privacidad para laboratorios de cómputo</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="text-foreground-muted hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-foreground-muted leading-relaxed">
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 self-start">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">1. Impedir inicio de sesión en Google</h4>
                  <p>
                    Intercepta de forma inmediata las páginas de inicio de sesión de Google (Gmail, Drive, YouTube) en el navegador. Cuando un usuario intenta ingresar con una cuenta personal, el navegador lo redirige a la pantalla institucional de aviso protegiendo sus datos personales.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 shrink-0 self-start">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">2. Restricción por Dominio (@upc.edu.pe)</h4>
                  <p>
                    Inyecta de forma transparente la cabecera oficial de Google Workspace <code className="text-brand-300 font-mono">X-GoogApps-Allowed-Domains</code>. Esto permite que los alumnos utilicen sus correos institucionales universitarios autorizados mientras Google bloquea cualquier cuenta externa de Gmail.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 self-start">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">3. Bloqueo de Modo Incógnito</h4>
                  <p>
                    Monitorea en tiempo real si algún usuario intenta abrir una ventana privada. Si la política está activa, la extensión cierra la pestaña de incógnito inmediatamente para garantizar que la navegación permanezca visible y supervisada en el aula.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 self-start">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">4. Limpieza al salir y Cierre forzado</h4>
                  <p>
                    Elimina al instante cookies y tokens de sesión guardados en Google y Microsoft. Cuando termina una clase o cambia de turno, puedes pulsar "Cerrar sesiones activas ahora" para purgar todas las cuentas abiertas de golpe.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE CIERRE FORZADO DE SESIÓN */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">¿Cerrar sesiones activas ahora?</h3>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed">
              {selectedHostnames.length > 0 
                ? `Se enviará la orden inmediata a ${selectedHostnames.length} equipo(s) seleccionado(s). La extensión purgará cookies y sesiones de Google, Microsoft y redes en segundo plano.`
                : 'Se enviará la orden de cierre forzado a TODOS los equipos registrados en el sistema.'
              }
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmergencyFlushConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Confirmar cierre de sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
