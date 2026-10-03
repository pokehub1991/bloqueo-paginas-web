import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  HelpCircle, 
  Table as TableIcon, 
  RefreshCw, 
  Building2, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { api } from '../lib/api';

export default function CsvImportModal({ isOpen, onClose, onImportSuccess }) {
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [showTutorial, setShowTutorial] = useState(false); // Guía oculta por defecto, desplegable con botón Tutorial
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Analizar el texto CSV y generar la previsualización
  const parseCsvText = (text) => {
    setCsvContent(text);
    setParseError(null);

    if (!text.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setPreviewRows([]);
      return;
    }

    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes('\t')) delimiter = '\t';

    let startIndex = 0;
    const headerLower = firstLine.toLowerCase();
    if (headerLower.includes('host') || headerLower.includes('nombre') || headerLower.includes('ip') || headerLower.includes('equipo')) {
      startIndex = 1;
    }

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const rows = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      let h = parts[0].trim().toUpperCase();
      let ip = parts[1].trim();

      // Si vienen invertidas las columnas
      if (ipv4Regex.test(h) && !ipv4Regex.test(ip)) {
        const temp = h;
        h = ip.toUpperCase();
        ip = temp;
      }

      if (!h || !ipv4Regex.test(ip)) continue;

      // Detección académica
      let clean = h.replace(/^(PC|WS|LAB|EQUIPO)[-_]/, '');
      let pavilion = 'Sin asignar';
      let lab = 'Sin asignar';

      const stdMatch = clean.match(/^V([A-Z])(\d+)/);
      if (stdMatch && ['A', 'E', 'G', 'H'].includes(stdMatch[1])) {
        pavilion = stdMatch[1];
        lab = `V${stdMatch[1]}${stdMatch[2]}`;
      } else {
        const altMatch = clean.match(/^([A-Z])[-_]?(\d{2,4})/);
        if (altMatch && ['A', 'E', 'G', 'H'].includes(altMatch[1])) {
          pavilion = altMatch[1];
          lab = `V${altMatch[1]}${altMatch[2]}`;
        }
      }

      rows.push({
        hostname: h,
        ip: ip,
        pavilion: pavilion,
        laboratory: lab
      });
    }

    if (rows.length === 0 && lines.length > 0) {
      setParseError('No se detectaron registros válidos con formato: hostname,ip (ej: VH101-01,10.142.233.10)');
    }

    setPreviewRows(rows);
  };

  // Manejar archivo arrastrado o seleccionado
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  // Descargar plantilla CSV de ejemplo
  const handleDownloadTemplate = () => {
    const templateContent = [
      'hostname,ip',
      'VH101-01,10.142.233.10',
      'VH101-02,10.142.233.11',
      'VH101-03,10.142.233.12',
      'VH102-01,10.142.234.10',
      'VA108-01,10.142.235.10',
      'VE201-01,10.142.236.10',
      'VG104-01,10.142.237.10'
    ].join('\r\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_laboratorio_upc.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Enviar al servidor para inserción y actualización
  const handleExecuteImport = async () => {
    if (!csvContent || previewRows.length === 0) return;

    setIsLoading(true);
    try {
      const res = await api.importCsv(csvContent);
      onImportSuccess(res);
      onClose();
    } catch (err) {
      setParseError(err.message || 'Error al importar los equipos al servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-5 border-b border-border/80 bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cargar Laboratorios desde CSV</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
                  Mapeo IP → Host Real
                </span>
              </h2>
              <p className="text-xs text-foreground-muted">
                Asocia automáticamente las IPs a sus nombres reales de equipo y pabellones universitarios.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-subtle hover:text-white hover:bg-surface-highlight transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Barra superior de pestañas y botones de Tutorial / Plantilla */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            {/* Pestañas: Subir archivo o Pegar texto */}
            <div className="flex items-center gap-1.5 bg-surface-elevated/70 p-1 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'upload'
                    ? 'bg-brand-500/25 text-brand-300 shadow-sm'
                    : 'text-foreground-muted hover:text-white hover:bg-surface/50'
                }`}
              >
                Subir archivo (.csv / .txt)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'paste'
                    ? 'bg-brand-500/25 text-brand-300 shadow-sm'
                    : 'text-foreground-muted hover:text-white hover:bg-surface/50'
                }`}
              >
                Pegar texto directamente
              </button>
            </div>

            {/* Botón Tutorial (desplegable) y Descargar Plantilla */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTutorial(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  showTutorial
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                    : 'bg-surface-elevated text-foreground-muted hover:text-white border-border/70 hover:border-brand-500/40'
                }`}
                title="Desplegar guía tutorial de formato y uso"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
                <span>Tutorial</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showTutorial ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-elevated text-brand-400 hover:text-brand-300 border border-border/70 hover:border-brand-500/40 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar plantilla CSV</span>
              </button>
            </div>
          </div>

          {/* GUÍA TUTORIAL (DESPLEGABLE / OCULTA POR DEFECTO) */}
          {showTutorial && (
            <div className="p-4 rounded-xl bg-surface-elevated/90 border border-brand-500/30 space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>Tutorial: Guía de Carga de Laboratorios</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTutorial(false)}
                  className="text-foreground-subtle hover:text-white text-xs underline"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-foreground-muted">
                <div className="p-2.5 rounded-lg bg-surface/80 border border-border/40">
                  <strong className="block text-white mb-0.5">1. Formato requerido:</strong>
                  Líneas con <code>hostname,ip</code>. Ejemplo:
                  <div className="font-mono text-xs text-brand-300 mt-1 bg-surface-elevated px-1.5 py-0.5 rounded">
                    VH101-01,10.142.233.10
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface/80 border border-border/40">
                  <strong className="block text-white mb-0.5">2. Pabellón Automático:</strong>
                  El sistema detecta automáticamente pabellones (A, E, G, H) y aulas según el prefijo (ej: <code>VH101-01</code> va a Pabellón H).
                </div>

                <div className="p-2.5 rounded-lg bg-surface/80 border border-border/40">
                  <strong className="block text-white mb-0.5">3. Actualización en Vivo:</strong>
                  Si ya hay extensiones conectadas como <code>PC-LAB-XX</code>, al subir el CSV se renombran al instante a su host real.
                </div>
              </div>
            </div>
          )}

          {/* Zona de Carga de Archivo */}
          {activeTab === 'upload' ? (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-brand-500/60 rounded-2xl p-6 text-center cursor-pointer transition bg-surface-elevated/20 hover:bg-surface-elevated/50 flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                {fileName ? (
                  <div>
                    <span className="font-bold text-sm text-white">{fileName}</span>
                    <span className="block text-xs text-brand-400 mt-0.5">Clic para cambiar de archivo</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-sm text-white">Haz clic aquí para seleccionar tu archivo CSV</span>
                    <span className="block text-xs text-foreground-muted mt-0.5">o arrástralo y suéltalo en esta zona</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={csvContent}
                onChange={(e) => parseCsvText(e.target.value)}
                placeholder="Pega aquí el contenido de tu CSV, por ejemplo:&#10;hostname,ip&#10;VH101-01,10.142.233.10&#10;VH101-02,10.142.233.11&#10;VA108-01,10.142.235.10"
                rows={5}
                className="w-full bg-surface-elevated border border-border focus:border-brand-500 rounded-xl p-3 text-xs font-mono text-white outline-none transition"
              />
            </div>
          )}

          {/* Error de análisis si existe */}
          {parseError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Previsualización de Registros Extraídos */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  <span>Previsualización ({previewRows.length} equipos detectados)</span>
                </span>
                <span className="text-[11px] text-foreground-muted font-normal">
                  Se clasificarán automáticamente por pabellón
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-border/80 bg-surface-elevated/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated text-foreground-muted sticky top-0 border-b border-border/80 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Hostname</th>
                      <th className="py-2 px-3">Dirección IP</th>
                      <th className="py-2 px-3">Pabellón</th>
                      <th className="py-2 px-3">Laboratorio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    {previewRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-highlight/30">
                        <td className="py-1.5 px-3 text-foreground-subtle font-sans">{idx + 1}</td>
                        <td className="py-1.5 px-3 text-white font-bold">{row.hostname}</td>
                        <td className="py-1.5 px-3 text-foreground-muted">{row.ip}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-sans text-[10px] font-bold ${
                            row.pavilion === 'H' ? 'bg-indigo-500/20 text-indigo-300' :
                            row.pavilion === 'A' ? 'bg-sky-500/20 text-sky-300' :
                            row.pavilion === 'E' ? 'bg-amber-500/20 text-amber-300' :
                            row.pavilion === 'G' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-surface-highlight text-foreground-muted'
                          }`}>
                            {row.pavilion !== 'Sin asignar' ? `Pab. ${row.pavilion}` : 'Sin asignar'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-foreground font-sans">
                          {row.laboratory}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > 100 && (
                <p className="text-[11px] text-foreground-subtle text-right">
                  Mostrando los primeros 100 de {previewRows.length} equipos. Todos serán importados.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pie de acciones del modal */}
        <div className="flex items-center justify-between p-4 border-t border-border/80 bg-surface-elevated/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-highlight text-xs font-semibold text-foreground-muted hover:text-white transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isLoading || previewRows.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold tracking-wide transition active:scale-95 shadow-lg shadow-emerald-950/60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importando equipos...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Importar {previewRows.length} Equipos al Catálogo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
