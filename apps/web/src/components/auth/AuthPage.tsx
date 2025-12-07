/**
 * AuthPage - Página de autenticación (Login/Register)
 */

import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'login') {
      await login({ email, password });
    } else if (mode === 'register') {
      await register({ email, password, name });
    } else if (mode === 'forgot-password') {
      // Simular envío de recuperación (TODO: implementar backend)
      setForgotPasswordSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-3xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-white">FluxCore</h1>
          <p className="text-gray-400 mt-2">
            Sistema de Mensajería Universal
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {mode === 'login' ? 'Iniciar Sesión' : 
             mode === 'register' ? 'Crear Cuenta' : 
             'Recuperar Contraseña'}
          </h2>

          {/* Mensaje de éxito para recuperar contraseña */}
          {forgotPasswordSent && mode === 'forgot-password' && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
              Si el correo existe, recibirás un enlace para restablecer tu contraseña.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu nombre"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-10 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
                'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                isLoading
                  ? 'bg-blue-600/50 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
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
                  className="text-gray-400 hover:text-gray-300 text-sm block w-full"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  onClick={() => { setMode('register'); clearError(); }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ¿No tienes cuenta? Regístrate
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                onClick={() => { setMode('login'); clearError(); }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            )}
            {mode === 'forgot-password' && (
              <button
                onClick={() => { setMode('login'); clearError(); setForgotPasswordSent(false); }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>FluxCore v0.2.0</p>
        </div>
      </div>
    </div>
  );
}
