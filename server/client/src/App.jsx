import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  HelpCircle, 
  Terminal, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Wifi
} from 'lucide-react';

import { api, getAuthToken } from './lib/api';
import Hero from './components/Hero';
import DeviceTable from './components/DeviceTable';
import QuickCatalog from './components/QuickCatalog';
import BulkActionBar from './components/BulkActionBar';
import OnboardingModal from './components/OnboardingModal';
import LoginModal from './components/LoginModal';
import EditRulesModal from './components/EditRulesModal';
import AgentGuideModal from './components/AgentGuideModal';

export default function App() {
  // Estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [currentUser, setCurrentUser] = useState(null);

  // Datos del sistema
  const [devices, setDevices] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [favoritesByCategory, setFavoritesByCategory] = useState({});
  const [systemInfo, setSystemInfo] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Selección de equipos
  const [selectedHostnames, setSelectedHostnames] = useState([]);

  // Notificaciones flotantes
  const [toast, setToast] = useState(null);

  // Modales
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAgentGuide, setShowAgentGuide] = useState(false);
  const [editModalData, setEditModalData] = useState({
    isOpen: false,
    hostnames: [],
    initialUrls: []
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
      const [devicesRes, favsRes, sysRes] = await Promise.all([
        api.getDevices().catch(() => ({ devices: [], onlineCount: 0 })),
        api.getFavorites().catch(() => ({ categories: {} })),
        api.getSystemInfo().catch(() => ({}))
      ]);

      setDevices(devicesRes.devices || []);
      setOnlineCount(devicesRes.onlineCount || 0);
      setFavoritesByCategory(favsRes.categories || {});
      setSystemInfo(sysRes || {});
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

      // Verificar si es la primera vez para mostrar Onboarding
      const hasSeenTour = localStorage.getItem('web_blocker_tour_seen');
      if (!hasSeenTour) {
        setShowOnboarding(true);
      }
    }
  }, [fetchData]);

  // Actualización periódica en tiempo real (cada 6 segundos)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchData();
    }, 6000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchData]);

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    fetchData();
    showToast('Bienvenido al Centro de Control.');
    const hasSeenTour = localStorage.getItem('web_blocker_tour_seen');
    if (!hasSeenTour) {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setSelectedHostnames([]);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('web_blocker_tour_seen', 'true');
  };

  // Manejo de selecciones
  const handleToggleSelect = (hostname) => {
    setSelectedHostnames(prev => 
      prev.includes(hostname)
        ? prev.filter(h => h !== hostname)
        : [...prev, hostname]
    );
  };

  const handleSelectAll = () => {
    if (selectedHostnames.length === devices.length) {
      setSelectedHostnames([]);
    } else {
      setSelectedHostnames(devices.map(d => d.hostname));
    }
  };

  // Asignar una URL del catálogo a los equipos seleccionados
  const handleApplyUrlToSelected = async (url) => {
    if (selectedHostnames.length === 0) {
      showToast('Por favor marca las computadoras en las que deseas aplicar la regla.', 'warn');
      return;
    }

    try {
      setIsLoading(true);
      await api.blockUrls(selectedHostnames, [url], 'add');
      showToast(`Regla aplicada a ${selectedHostnames.length} computadora(s): ${url}`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir modal de edición para un solo equipo
  const handleOpenEditRulesSingle = (device) => {
    setEditModalData({
      isOpen: true,
      hostnames: [device.hostname],
      initialUrls: device.blockedUrls || []
    });
  };

  // Abrir modal de edición para computadoras seleccionadas
  const handleOpenEditRulesBulk = () => {
    if (selectedHostnames.length === 0) return;
    // Combinar reglas de los equipos seleccionados
    const combinedUrls = Array.from(
      new Set(
        devices
          .filter(d => selectedHostnames.includes(d.hostname))
          .flatMap(d => d.blockedUrls || [])
      )
    );

    setEditModalData({
      isOpen: true,
      hostnames: selectedHostnames,
      initialUrls: combinedUrls
    });
  };

  // Guardar reglas desde el modal
  const handleSaveModalRules = async (hostnames, urls) => {
    try {
      setIsLoading(true);
      await api.blockUrls(hostnames, urls, 'replace');
      setEditModalData(prev => ({ ...prev, isOpen: false }));
      showToast(`Reglas actualizadas para ${hostnames.length} computadora(s).`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Desbloquear un solo equipo
  const handleUnblockSingle = async (hostname) => {
    try {
      setIsLoading(true);
      await api.unblockAll([hostname]);
      showToast(`Se removieron las restricciones de ${hostname}.`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Desbloquear computadoras seleccionadas
  const handleUnblockSelected = async () => {
    if (selectedHostnames.length === 0) return;
    try {
      setIsLoading(true);
      await api.unblockAll(selectedHostnames);
      showToast(`Se desbloquearon ${selectedHostnames.length} computadoras.`);
      setSelectedHostnames([]);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar equipo
  const handleDeleteDevice = async (hostname) => {
    if (!confirm(`¿Deseas quitar la computadora ${hostname} de la lista?`)) return;
    try {
      await api.deleteDevice(hostname);
      setSelectedHostnames(prev => prev.filter(h => h !== hostname));
      showToast(`Computadora ${hostname} eliminada.`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Cargar computadoras de prueba
  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      await api.seedDemoDevices();
      showToast('Se cargaron 3 computadoras de prueba con reglas de ejemplo.');
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Agregar favorito personalizado
  const handleAddCustomFavorite = async (fav) => {
    try {
      await api.createFavorite(fav);
      showToast(`Página "${fav.title}" agregada al catálogo.`);
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Eliminar favorito
  const handleDeleteFavorite = async (id) => {
    try {
      await api.deleteFavorite(id);
      showToast('Página removida del catálogo de favoritos.');
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Restablecer favoritos predeterminados
  const handleResetFavorites = async () => {
    try {
      await api.resetFavorites();
      showToast('Se restablecieron las páginas favoritas predeterminadas.');
      await fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };


  // Calcular total de páginas bloqueadas únicas en la red
  const totalBlockedRules = Array.from(
    new Set(devices.flatMap(d => d.blockedUrls || []))
  ).length;

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-brand-500/20">
      {/* Toast flotante de notificaciones */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-scale-in">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium ${
            toast.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : toast.type === 'warn'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-surface-elevated border-brand-500/30 text-white'
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

      {/* Barra superior de navegación */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight block">
                Centro de Control Web
              </span>
              <span className="text-[10px] text-foreground-subtle block">
                Red Local: {systemInfo.recommendedUrl || 'http://localhost:3000'}
              </span>
            </div>
          </div>

          {/* Acciones de la barra superior */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white text-xs font-medium transition"
              title="Abrir el tour interactivo"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">¿Cómo funciona?</span>
            </button>

            <button
              onClick={() => setShowAgentGuide(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white text-xs font-medium transition"
              title="Instrucciones para conectar computadoras Windows"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Guía del agente</span>
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-rose-500/10 hover:border-rose-500/30 text-foreground-subtle hover:text-rose-400 border border-border text-xs font-medium transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Componente Hero con resumen en lenguaje natural */}
        <Hero
          totalDevices={devices.length}
          onlineDevices={onlineCount}
          totalBlockedRules={totalBlockedRules}
          onOpenOnboarding={() => setShowOnboarding(true)}
          onOpenAgentGuide={() => setShowAgentGuide(true)}
          onSeedDemo={handleSeedDemo}
          isSeeding={isSeeding}
        />

        {/* Catálogo rápido de páginas populares */}
        <QuickCatalog
          favoritesByCategory={favoritesByCategory}
          selectedHostnames={selectedHostnames}
          onApplyUrlToSelected={handleApplyUrlToSelected}
          onAddCustomFavorite={handleAddCustomFavorite}
          onDeleteFavorite={handleDeleteFavorite}
          onResetFavorites={handleResetFavorites}
          isLoading={isLoading}
        />

        {/* Tabla interactiva de computadoras */}
        <DeviceTable
          devices={devices}
          selectedHostnames={selectedHostnames}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onOpenEditRules={handleOpenEditRulesSingle}
          onUnblockSingle={handleUnblockSingle}
          onDeleteDevice={handleDeleteDevice}
          onRefresh={fetchData}
          isLoading={isLoading}
        />
      </main>

      {/* Barra flotante de acciones para selección múltiple */}
      <BulkActionBar
        selectedCount={selectedHostnames.length}
        onOpenApplyRules={handleOpenEditRulesBulk}
        onUnblockSelected={handleUnblockSelected}
        onClearSelection={() => setSelectedHostnames([])}
        isLoading={isLoading}
      />

      {/* Modales */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
      />

      <AgentGuideModal
        isOpen={showAgentGuide}
        onClose={() => setShowAgentGuide(false)}
        systemInfo={systemInfo}
      />

      <EditRulesModal
        isOpen={editModalData.isOpen}
        onClose={() => setEditModalData(prev => ({ ...prev, isOpen: false }))}
        targetHostnames={editModalData.hostnames}
        initialUrls={editModalData.initialUrls}
        onSaveRules={handleSaveModalRules}
        isLoading={isLoading}
      />
    </div>
  );
}
