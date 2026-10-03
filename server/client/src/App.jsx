import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  HelpCircle, 
  Laptop, 
  LogOut, 
  Building2,
  CheckCircle2, 
  AlertCircle,
  Upload
} from 'lucide-react';

import { api, getAuthToken } from './lib/api';
import PavilionSelector from './components/PavilionSelector';
import DeviceTable from './components/DeviceTable';
import SidebarControl from './components/SidebarControl';
import PavilionModal from './components/PavilionModal';
import OnboardingModal from './components/OnboardingModal';
import LoginModal from './components/LoginModal';
import AgentGuideModal from './components/AgentGuideModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import CsvImportModal from './components/CsvImportModal';

export default function App() {
  // Estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [currentUser, setCurrentUser] = useState(null);

  // Datos del sistema
  const [devices, setDevices] = useState([]);
  const [pavilions, setPavilions] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedPavilion, setSelectedPavilion] = useState('ALL');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [onlineCount, setOnlineCount] = useState(0);
  const [systemInfo, setSystemInfo] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Selección de equipos
  const [selectedHostnames, setSelectedHostnames] = useState([]);

  // Notificaciones flotantes (Toast)
  const [toast, setToast] = useState(null);

  // Modales
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPavilionModal, setShowPavilionModal] = useState(false);
  const [showAgentGuide, setShowAgentGuide] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: 'single', // 'single' | 'bulk' | 'lab'
    title: '',
    description: '',
    payload: null,
    count: 0
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Cargar datos principales
  const fetchData = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const [devicesRes, sysRes, favRes] = await Promise.all([
        api.getDevices().catch(() => ({ devices: [], pavilions: [], laboratories: [], onlineCount: 0 })),
        api.getSystemInfo().catch(() => ({})),
        api.getFavorites().catch(() => ({ favorites: [] }))
      ]);

      const incomingDevices = devicesRes.devices || [];
      setDevices(incomingDevices);
      setPavilions(devicesRes.pavilions || []);
      setLaboratories(devicesRes.laboratories || []);
      setOnlineCount(devicesRes.onlineCount || 0);
      setSystemInfo(sysRes || {});
      setFavorites(favRes.favorites || []);

      // Mantener consistencia sin conflictos si otro usuario en otra PC eliminó equipos
      setSelectedHostnames(prev => 
        prev.filter(host => incomingDevices.some(d => d.hostname === host))
      );
    } catch (err) {
      console.error('Error al sincronizar datos:', err);
    }
  }, []);

  // Verificar sesión y primera visita para Onboarding
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
      fetchData();

      const hasSeenTour = localStorage.getItem('web_blocker_tour_seen');
      if (!hasSeenTour) {
        setShowOnboarding(true);
      }
    }
  }, [fetchData]);

  // Sincronización en tiempo real multidispositivo (Server-Sent Events + Sondeo de respaldo)
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = getAuthToken();
    let eventSource = null;

    if (token) {
      try {
        const sseUrl = `/api/devices/events?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'sync') {
              // Sincronización instantánea entre navegadores en diferentes laboratorios
              fetchData();
            }
          } catch {
            // ignorar errores de parseo
          }
        };

        eventSource.onerror = () => {
          // El navegador reconecta automáticamente ante caídas temporales de red
        };
      } catch (err) {
        console.warn('SSE no disponible en este navegador, usando sondeo:', err);
      }
    }

    // Sondeo de respaldo continuo cada 2.5s para máxima consistencia y evitar conflictos
    const interval = setInterval(() => {
      fetchData();
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchData]);

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    fetchData();
    showToast('Bienvenido a UPC NetShield · Campus Villa');
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setSelectedHostnames([]);
  };

  // Filtrado de equipos por Pabellón y Laboratorio
  const filteredDevices = devices.filter(d => {
    const matchPavilion = selectedPavilion === 'ALL' || d.pavilion === selectedPavilion;
    const matchLab = selectedLab === 'ALL' || d.laboratory === selectedLab;
    return matchPavilion && matchLab;
  });

  // Manejo de selecciones
  const handleToggleSelect = (hostname) => {
    setSelectedHostnames(prev => 
      prev.includes(hostname)
        ? prev.filter(h => h !== hostname)
        : [...prev, hostname]
    );
  };

  const handleSelectAll = (newSelection) => {
    if (Array.isArray(newSelection)) {
      setSelectedHostnames(newSelection);
    } else {
      if (selectedHostnames.length === filteredDevices.length) {
        setSelectedHostnames([]);
      } else {
        setSelectedHostnames(filteredDevices.map(d => d.hostname));
      }
    }
  };

  // Seleccionar todos los equipos de un laboratorio específico
  const handleSelectWholeLab = (labCode) => {
    const labHostnames = devices.filter(d => d.laboratory === labCode).map(d => d.hostname);
    setSelectedHostnames(prev => {
      const allSelected = labHostnames.length > 0 && labHostnames.every(h => prev.includes(h));
      if (allSelected) {
        return prev.filter(h => !labHostnames.includes(h));
      } else {
        return Array.from(new Set([...prev, ...labHostnames]));
      }
    });
    showToast(`Selección actualizada para el laboratorio ${labCode}.`);
  };

  // Seleccionar todos los visibles
  const handleSelectAllVisible = () => {
    setSelectedHostnames(filteredDevices.map(d => d.hostname));
    showToast(`Se seleccionaron los ${filteredDevices.length} equipos visibles.`);
  };

  // Aplicar modo de navegación a equipos seleccionados
  const handleApplyPolicy = async ({ hostnames, policyMode, urls = [], mode = 'add' }) => {
    if (!hostnames || hostnames.length === 0) {
      showToast('Selecciona al menos un equipo en la tabla.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.blockUrls(hostnames, urls, mode, policyMode);
      const modeLabel = policyMode === 'block_all' 
        ? 'Bloqueo Total' 
        : policyMode === 'allow_list' 
        ? 'Permitir Lista' 
        : policyMode === 'block_list' 
        ? 'Bloquear Lista' 
        : 'Navegación Libre';

      showToast(`Regla [${modeLabel}] aplicada a ${hostnames.length} equipo(s).`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar una URL a los seleccionados con persistencia
  const handleAddUrlToSelected = async (url, policyMode) => {
    if (selectedHostnames.length === 0) {
      showToast('Marca las casillas de los equipos que deseas configurar.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const ruleType = policyMode === 'allow_list' ? 'allow' : 'block';
      await api.blockUrls(selectedHostnames, [url], 'add', policyMode, ruleType);
      showToast(`Sitio "${url}" agregado a ${selectedHostnames.length} equipo(s).`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Desbloquear / Restablecer libre navegación
  const handleUnblock = async (hostnames) => {
    if (!hostnames || hostnames.length === 0) return;
    setIsLoading(true);
    try {
      await api.unblockAll(hostnames);
      showToast(`Navegación libre restablecida en ${hostnames.length} equipo(s).`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Solicitud de eliminación individual de un equipo
  const handleRequestDeleteDevice = (hostname) => {
    setDeleteModal({
      isOpen: true,
      type: 'single',
      title: `¿Eliminar ${hostname}?`,
      description: `Esta computadora será eliminada del registro de monitorización. Si el agente sigue activo, volverá a conectarse en el siguiente pulso.`,
      payload: hostname,
      count: 1
    });
  };

  // Renombrar una estación de trabajo
  const handleRenameDevice = async (oldHostname, newHostname) => {
    if (!newHostname || !newHostname.trim() || oldHostname === newHostname) return;
    setIsLoading(true);
    try {
      const res = await api.renameDevice(oldHostname, newHostname);
      showToast(res.message || `Equipo renombrado a ${newHostname}`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // Eliminar una URL específica de los seleccionados
  const handleRemoveRuleUrl = async (url, policyMode) => {
    if (selectedHostnames.length === 0) return;
    setIsLoading(true);
    try {
      await api.removeRuleUrl(selectedHostnames, url, policyMode);
      showToast(`Página "${url}" eliminada.`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar una URL editada en los seleccionados
  const handleUpdateRuleUrl = async (oldUrl, newUrl, policyMode) => {
    if (selectedHostnames.length === 0) return;
    setIsLoading(true);
    try {
      await api.updateRuleUrl(selectedHostnames, oldUrl, newUrl, policyMode);
      showToast(`Página actualizada a "${newUrl}".`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // Solicitud de eliminación de equipos seleccionados
  const handleRequestDeleteSelected = () => {
    if (selectedHostnames.length === 0) return;
    setDeleteModal({
      isOpen: true,
      type: 'bulk',
      title: `¿Eliminar ${selectedHostnames.length} equipo(s) seleccionados?`,
      description: `Se eliminarán del registro los equipos marcados (${selectedHostnames.join(', ')}).`,
      payload: selectedHostnames,
      count: selectedHostnames.length
    });
  };

  // Solicitud de eliminación de un laboratorio completo
  const handleRequestDeleteLab = (labCode) => {
    const labDevices = devices.filter(d => d.laboratory === labCode);
    setDeleteModal({
      isOpen: true,
      type: 'lab',
      title: `¿Eliminar Laboratorio ${labCode}?`,
      description: `Se eliminarán los ${labDevices.length} equipos registrados bajo el laboratorio ${labCode}.`,
      payload: labCode,
      count: labDevices.length
    });
  };

  // Ejecutar eliminación confirmada
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      if (deleteModal.type === 'single') {
        await api.deleteDevice(deleteModal.payload);
        setSelectedHostnames(prev => prev.filter(h => h !== deleteModal.payload));
        showToast(`Equipo ${deleteModal.payload} eliminado del sistema.`);
      } else if (deleteModal.type === 'bulk') {
        await api.deleteBulkDevices(deleteModal.payload);
        setSelectedHostnames([]);
        showToast(`Se eliminaron ${deleteModal.count} equipos del registro.`);
      } else if (deleteModal.type === 'lab') {
        await api.deleteLaboratory(deleteModal.payload);
        setSelectedLab('ALL');
        setSelectedHostnames(prev => {
          const labNames = devices.filter(d => d.laboratory === deleteModal.payload).map(d => d.hostname);
          return prev.filter(h => !labNames.includes(h));
        });
        showToast(`Laboratorio ${deleteModal.payload} eliminado exitosamente.`);
      }
      setDeleteModal({ isOpen: false, type: 'single', title: '', description: '', payload: null, count: 0 });
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRulesCount = devices.reduce((acc, d) => acc + (d.rulesCount || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Toast flotante con entrada suave exponencial */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-slide-down">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 text-amber-200 border-amber-800'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Barra de navegación superior: UPC NetShield + Botones ordenados por prioridad */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30 shadow-md shadow-black/20">
        <div className="w-[95%] max-w-[98%] mx-auto h-16 flex items-center justify-between gap-4">
          {/* Logo oficial y contexto Campus Villa */}
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-surface-elevated border border-border/80 shadow-md shadow-black/20 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="UPC NetShield Logo" 
                className="w-8 h-8 object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base md:text-lg tracking-tight text-white">
                  UPC NetShield
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/15 text-brand-400 tracking-wide">
                  Campus Villa
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted hidden sm:block">
                Control de Acceso Web · Universidad Peruana de Ciencias Aplicadas
              </p>
            </div>
          </div>

          {/* Botones de acción ordenados por prioridad / jerarquía */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Conectar equipo (Prioridad Alta: Alto contraste, 100% legible) */}
            <button
              onClick={() => setShowAgentGuide(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs md:text-sm font-bold tracking-wide transition active:scale-95 shadow-md shadow-brand-500/20 cursor-pointer"
              title="Guía rápida para conectar una computadora de laboratorio"
            >
              <Laptop className="w-4 h-4 text-white stroke-[2.5]" />
              <span className="text-white drop-shadow-sm font-bold">Conectar equipo</span>
            </button>

            {/* 2. Cargar Laboratorio (CSV) */}
            <button
              onClick={() => setShowCsvImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
              title="Cargar equipos y mapear IPs a Hostnames mediante archivo CSV"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Cargar Laboratorio (CSV)</span>
            </button>

            {/* 3. Ver Pabellones (Exploración) */}
            <button
              onClick={() => setShowPavilionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
              title="Explorar pabellones y laboratorios"
            >
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden md:inline">Ver Pabellones</span>
            </button>

            {/* 3. ¿Cómo funciona esto? (Ayuda) */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
              title="Explicación del sistema y modos de bloqueo"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden lg:inline">¿Cómo funciona esto?</span>
            </button>

            {/* 4. Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-rose-500/20 border border-border hover:border-rose-500/40 text-foreground-muted hover:text-rose-400 text-xs font-medium transition active:scale-95 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal: Compacto directamente a la tabla sin descripciones redundantes */}
      <main className="flex-1 w-[95%] max-w-[98%] mx-auto py-4 space-y-4">
        {/* Selector y Navegación de Pabellones y Laboratorios (A, E, G, H y Sin asignar) */}
        <PavilionSelector
          pavilions={pavilions}
          laboratories={laboratories}
          selectedPavilion={selectedPavilion}
          selectedLab={selectedLab}
          onSelectPavilion={(code) => {
            setSelectedPavilion(code);
            setSelectedLab('ALL');
          }}
          onSelectLab={setSelectedLab}
          onSelectWholeLab={handleSelectWholeLab}
          onDeleteLab={handleRequestDeleteLab}
          totalDevices={devices.length}
          totalOnline={onlineCount}
        />

        {/* Layout en 2 Columnas: Izquierda (Tabla) + Derecha (Sidebar Sticky de Reglas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Tabla de Equipos con Paginación (Máx 50) y Métricas de Hero en el Pie */}
          <div className="lg:col-span-8 space-y-4">
            <DeviceTable
              devices={filteredDevices}
              selectedHostnames={selectedHostnames}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onRefresh={fetchData}
              onRenameDevice={handleRenameDevice}
              onDeleteDevice={handleRequestDeleteDevice}
              onDeleteSelected={handleRequestDeleteSelected}
              isLoading={isLoading}
              totalOnline={onlineCount}
              pavilionsCount={pavilions.length}
              totalRulesCount={totalRulesCount}
            />
          </div>

          {/* Columna Derecha: Sidebar Sticky "Reglas" siempre visible pegado a la parte superior al scrollear */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              <SidebarControl
                selectedHostnames={selectedHostnames}
                devices={filteredDevices}
                favorites={favorites}
                onApplyPolicy={handleApplyPolicy}
                onAddUrlToSelected={handleAddUrlToSelected}
                onRemoveRuleUrl={handleRemoveRuleUrl}
                onUpdateRuleUrl={handleUpdateRuleUrl}
                onUnblockSelected={() => handleUnblock(selectedHostnames)}
                onSelectAllVisible={handleSelectAllVisible}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página minimalista moderno */}
      <footer className="w-[95%] max-w-[98%] mx-auto py-5 mt-auto border-t border-border/50 text-center text-xs text-foreground-subtle">
        <p className="tracking-wide">
          Concepto, dirección y Prompt Engineering por <span className="text-white font-medium">Bryan</span> • Desarrollado con IA © 2026
        </p>
      </footer>

      {/* Modales */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'single', title: '', description: '', payload: null, count: 0 })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.title}
        description={deleteModal.description}
        itemCount={deleteModal.count}
        isLoading={isLoading}
      />

      <PavilionModal
        isOpen={showPavilionModal}
        onClose={() => setShowPavilionModal(false)}
        pavilions={pavilions}
        selectedPavilion={selectedPavilion}
        onSelectPavilion={(code) => {
          setSelectedPavilion(code);
          setSelectedLab('ALL');
        }}
        totalDevices={devices.length}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <AgentGuideModal
        isOpen={showAgentGuide}
        onClose={() => setShowAgentGuide(false)}
        serverIp={systemInfo.localIps?.[0] || '10.142.240.190'}
        port={systemInfo.port || 5050}
      />

      {/* Modal de Importación CSV de Laboratorios */}
      <CsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onImportSuccess={(res) => {
          showToast(res.message);
          fetchData();
        }}
      />

      {/* Modal de Login si no está autenticado */}
      {!isAuthenticated && (
        <LoginModal
          isOpen={!isAuthenticated}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
