/**
 * AuthPage - Página de autenticación (Login/Register)
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../services/api';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

type AuthMode = 'login' | 'register' | 'forgot-password';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const { login, register, isLoading, error, clearError } = useAuthStore();
  const { resolvedTheme } = useThemeStore();

  // Aplicar tema al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'login') {
      await login({ email, password });
    } else if (mode === 'register') {
      await register({ email, password, name });
    } else if (mode === 'forgot-password') {
      // Llamar al endpoint real
      try {
        await api.forgotPassword(email);
        setForgotPasswordSent(true);
      } catch (err) {
        console.error('[AuthPage] Forgot password error:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center p-4 transition-theme">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-theme-primary">FluxCore</h1>
          <p className="text-theme-secondary mt-2">
            Sistema de Mensajería Universal
          </p>
        </div>

        {/* Form */}
        <div className="bg-theme-tertiary rounded-2xl p-8 shadow-xl border border-theme-primary">
          <h2 className="text-xl font-semibold text-theme-primary mb-6 text-center">
            {mode === 'login' ? 'Iniciar Sesión' : 
             mode === 'register' ? 'Crear Cuenta' : 
             'Recuperar Contraseña'}
          </h2>

          {/* Mensaje de éxito para recuperar contraseña */}
          {forgotPasswordSent && mode === 'forgot-password' && (
            <div className="bg-color-success-muted border border-[var(--color-success)] text-[var(--color-success)] px-4 py-3 rounded-lg mb-6 text-sm">
              Si el correo existe, recibirás un enlace para restablecer tu contraseña.
            </div>
          )}

          {error && (
            <div className="bg-color-error-muted border border-[var(--color-error)] text-[var(--color-error)] px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Nombre
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-theme-elevated text-theme-primary pl-10 pr-4 py-3 rounded-lg border border-theme-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    placeholder="Tu nombre"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-theme-elevated text-theme-primary pl-10 pr-4 py-3 rounded-lg border border-theme-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-theme-elevated text-theme-primary pl-10 pr-12 py-3 rounded-lg border border-theme-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-inverse',
                isLoading
                  ? 'bg-accent/50 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent/80'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : mode === 'login' ? (
                'Iniciar Sesión'
              ) : mode === 'register' ? (
                'Crear Cuenta'
              ) : (
                'Enviar enlace'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => { setMode('forgot-password'); clearError(); setForgotPasswordSent(false); }}
                  className="text-theme-muted hover:text-theme-secondary text-sm block w-full"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  onClick={() => { setMode('register'); clearError(); }}
                  className="text-[var(--accent-primary)] hover:text-accent-hover text-sm"
                >
                  ¿No tienes cuenta? Regístrate
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                onClick={() => { setMode('login'); clearError(); }}
                className="text-[var(--accent-primary)] hover:text-accent-hover text-sm"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            )}
            {mode === 'forgot-password' && (
              <button
                onClick={() => { setMode('login'); clearError(); setForgotPasswordSent(false); }}
                className="text-[var(--accent-primary)] hover:text-accent-hover text-sm"
              >
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-theme-muted text-sm">
          <p>FluxCore v0.2.0</p>
        </div>
      </div>
    </div>
  );
}
