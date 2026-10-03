import React, { useState } from 'react';
import { Lock, User, Key, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('V1ll@uPc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Credenciales no válidas.');
      }

      localStorage.setItem('web_blocker_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background">
      {/* Fondo con brillo sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Acceso al Panel Central
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Ingresa las credenciales de administración para gestionar las reglas de navegación.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Usuario de acceso
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition placeholder:text-foreground-subtle"
                placeholder="Ej. admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-white text-sm focus:outline-none focus:border-brand-400 transition placeholder:text-foreground-subtle"
                placeholder="Tu contraseña"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-foreground-subtle flex items-center justify-between">
            <span>Credenciales por defecto:</span>
            <span className="font-mono text-brand-400 font-medium">admin / V1ll@uPc</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
          >
            <span>{loading ? 'Verificando...' : 'Entrar al Panel'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
