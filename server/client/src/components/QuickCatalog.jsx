import React, { useState } from 'react';
import { 
  Globe, 
  Share2, 
  Tv, 
  Gamepad2, 
  Plus, 
  Check, 
  Sparkles, 
  Trash2, 
  ShieldAlert, 
  Info, 
  BookmarkPlus, 
  Settings2, 
  RotateCcw,
  X,
  ExternalLink
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Redes Sociales': Share2,
  'Videos y Streaming': Tv,
  'Juegos Web': Gamepad2,
  'Personalizados': Globe
};

export default function QuickCatalog({
  favoritesByCategory = {},
  selectedHostnames = [],
  onApplyUrlToSelected,
  onAddCustomFavorite,
  onDeleteFavorite,
  onResetFavorites,
  isLoading = false
}) {
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulario de nuevo favorito
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('Personalizados');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formError, setFormError] = useState('');

  const existingCategories = Object.keys(favoritesByCategory);
  const categoriesList = ['Todos', ...existingCategories];

  // Aplicar URL directamente a equipos seleccionados
  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;
    const clean = customInputUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    onApplyUrlToSelected(clean);
    setCustomInputUrl('');
  };

  // Abrir modal de nuevo favorito prellenando la URL si el usuario escribió algo
  const handleOpenAddModal = (presetUrl = '') => {
    setNewUrl(presetUrl || customInputUrl);
    setNewTitle('');
    setNewCategory('Personalizados');
    setCustomCategoryInput('');
    setFormError('');
    setShowAddModal(true);
  };

  // Guardar nuevo favorito
  const handleSaveNewFavorite = (e) => {
    e.preventDefault();
    setFormError('');

    if (!newTitle.trim()) {
      setFormError('Por favor ingresa un nombre para identificar la página.');
      return;
    }
    if (!newUrl.trim()) {
      setFormError('Por favor ingresa la dirección web (ej. openai.com).');
      return;
    }

    const clean = newUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const finalCategory = newCategory === 'NEW' 
      ? (customCategoryInput.trim() || 'Personalizados')
      : newCategory;

    onAddCustomFavorite({
      title: newTitle.trim(),
      url: clean,
      category: finalCategory,
      icon: 'globe'
    });

    setShowAddModal(false);
    setNewTitle('');
    setNewUrl('');
    setCustomInputUrl('');
  };

  // Contar favoritos totales
  const totalFavoritesCount = Object.values(favoritesByCategory).reduce(
    (acc, items) => acc + (items ? items.length : 0), 0
  );

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 p-5 md:p-6">
      {/* Cabecera del catálogo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-medium mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Catálogo Rápido</span>
          </div>
          <h2 className="text-base font-semibold text-white">
            Páginas Populares y Favoritas
          </h2>
          <p className="text-xs text-foreground-muted">
            Haz clic en cualquiera de estas páginas para restringirla en los equipos marcados, o gestiona el catálogo agregando y eliminando sitios.
          </p>
        </div>

        {/* Acciones principales: Agregar nuevo y Modo Administrar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-md shadow-brand-500/20 active:scale-95"
            title="Agregar una nueva página a este catálogo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Favorito</span>
          </button>

          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition active:scale-95 ${
              isManageMode
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-surface-elevated hover:bg-surface-highlight border-border text-foreground-muted hover:text-white'
            }`}
            title="Activar modo para eliminar páginas del catálogo"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{isManageMode ? 'Listo' : 'Editar Catálogo'}</span>
          </button>
        </div>
      </div>

      {/* Input de dirección web para bloquear o guardar */}
      <div className="mb-6 p-4 rounded-xl bg-surface-elevated/40 border border-border">
        <label className="block text-xs font-medium text-foreground-muted mb-2">
          Escribe una dirección web para bloquearla en las computadoras marcadas o guardarla como favorito:
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={customInputUrl}
              onChange={(e) => setCustomInputUrl(e.target.value)}
              placeholder="Escribe el enlace aquí, por ejemplo: youtube.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition placeholder:text-foreground-subtle"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyCustom}
              disabled={!customInputUrl.trim() || selectedHostnames.length === 0 || isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs transition shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-40"
              title={selectedHostnames.length === 0 ? 'Primero selecciona al menos una computadora' : 'Bloquear esta dirección'}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Bloquear ({selectedHostnames.length || 0})</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(customInputUrl)}
              disabled={!customInputUrl.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground hover:text-white font-medium text-xs transition active:scale-95 disabled:opacity-40"
              title="Guardar esta dirección en el catálogo de favoritos"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Guardar en Favoritos</span>
            </button>
          </div>
        </div>

        {/* Ejemplos prácticos y guía en lenguaje natural */}
        <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-foreground-subtle">
          <Info className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground-muted">Ejemplos comunes:</strong>{' '}
            <code className="text-brand-400">facebook.com</code>,{' '}
            <code className="text-brand-400">netflix.com</code>,{' '}
            <code className="text-brand-400">roblox.com</code>, o{' '}
            <code className="text-brand-400">youtube.com/shorts</code> (para videos cortos).
          </span>
        </div>
      </div>

      {/* Pestañas de categorías */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-surface-elevated text-foreground-muted hover:text-white hover:bg-surface-highlight border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {totalFavoritesCount === 0 && onResetFavorites && (
          <button
            onClick={onResetFavorites}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-elevated hover:bg-surface-highlight border border-border text-xs text-brand-400 hover:text-brand-300 transition shrink-0"
            title="Restablecer favoritos originales"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer iniciales</span>
          </button>
        )}
      </div>

      {/* Grid de páginas favoritas por categorías */}
      {totalFavoritesCount === 0 ? (
        <div className="p-8 text-center bg-surface-elevated/30 rounded-xl border border-dashed border-border">
          <p className="text-xs text-foreground-muted mb-3">
            El catálogo de favoritos está vacío en este momento.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar tu primera página</span>
            </button>
            {onResetFavorites && (
              <button
                onClick={onResetFavorites}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border text-foreground-muted hover:text-white text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer favoritos sugeridos</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(favoritesByCategory).map(([categoryName, items]) => {
            if (activeCategory !== 'Todos' && activeCategory !== categoryName) {
              return null;
            }
            if (!items || items.length === 0) return null;

            const CatIcon = CATEGORY_ICONS[categoryName] || Globe;

            return (
              <div key={categoryName}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CatIcon className="w-3.5 h-3.5 text-foreground-subtle" />
                  <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    {categoryName} ({items.length})
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {items.map((fav) => (
                    <div
                      key={fav.id}
                      className="group relative flex flex-col items-start p-3 rounded-xl bg-surface-elevated hover:bg-surface-highlight border border-border hover:border-brand-500/40 text-left transition"
                    >
                      {/* Botón principal para bloquear en las computadoras marcadas */}
                      <button
                        onClick={() => onApplyUrlToSelected(fav.url)}
                        disabled={selectedHostnames.length === 0 || isLoading}
                        className="w-full text-left active:scale-95 disabled:pointer-events-none"
                        title={
                          selectedHostnames.length === 0 
                            ? 'Selecciona computadoras para bloquear esta página' 
                            : `Bloquear ${fav.url} en ${selectedHostnames.length} equipo(s)`
                        }
                      >
                        <span className="font-semibold text-white text-xs group-hover:text-brand-400 transition truncate block pr-5">
                          {fav.title}
                        </span>
                        <span className="font-mono text-[10px] text-foreground-subtle truncate block mt-0.5">
                          {fav.url}
                        </span>
                      </button>

                      {/* Botón para eliminar favorito: visible al pasar el mouse O si está en modo gestión */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar "${fav.title}" (${fav.url}) del catálogo de favoritos?`)) {
                            onDeleteFavorite(fav.id);
                          }
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-md transition ${
                          isManageMode
                            ? 'bg-rose-500 text-white shadow-sm opacity-100 animate-pulse-subtle'
                            : 'text-foreground-subtle hover:text-white hover:bg-rose-500/80 opacity-0 group-hover:opacity-100'
                        }`}
                        title={`Eliminar "${fav.title}" de favoritos`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para agregar nuevo favorito */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 animate-scale-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-foreground-subtle hover:text-foreground hover:bg-surface-highlight rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Agregar Nueva Página a Favoritos
                </h3>
                <p className="text-xs text-foreground-muted">
                  Estará disponible con 1 clic en el catálogo para bloquearla fácilmente.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveNewFavorite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. ChatGPT, Disney Plus, Steam..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition placeholder:text-foreground-subtle"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Dirección web (URL o dominio)
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Ej. openai.com o disneyplus.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition placeholder:text-foreground-subtle"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Categoría
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition"
                >
                  <option value="Personalizados">Personalizados</option>
                  <option value="Redes Sociales">Redes Sociales</option>
                  <option value="Videos y Streaming">Videos y Streaming</option>
                  <option value="Juegos Web">Juegos Web</option>
                  {existingCategories
                    .filter(c => !['Personalizados', 'Redes Sociales', 'Videos y Streaming', 'Juegos Web'].includes(c))
                    .map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  <option value="NEW">+ Crear nueva categoría...</option>
                </select>

                {newCategory === 'NEW' && (
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Escribe el nombre de la nueva categoría"
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-surface-elevated border border-brand-400/40 text-white text-xs focus:outline-none focus:border-brand-400 transition"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-white hover:bg-surface-highlight transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-md shadow-brand-500/20 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar en el catálogo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
