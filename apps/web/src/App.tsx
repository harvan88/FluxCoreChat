import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';
import { SystemMonitor } from './components/monitor';

function App() {
  const { isAuthenticated, initFromStorage } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Check if we're on /monitor route
  const isMonitorRoute = window.location.pathname === '/monitor';

  useEffect(() => {
    initFromStorage();
    // Pequeño delay para evitar flash de contenido
    const timer = setTimeout(() => setIsInitializing(false), 100);
    return () => clearTimeout(timer);
  }, [initFromStorage]);

  // Aplicar tema al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Loading inicial
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-inverse font-bold text-3xl">F</span>
          </div>
          <p className="text-muted text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Monitor route is always accessible (for debugging)
  if (isMonitorRoute) {
    return <SystemMonitor />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <Layout />;
}

export default App;
