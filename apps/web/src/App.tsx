import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { AccountDeletionPortalPage } from './pages/AccountDeletionPortalPage';
import { PublicProfilePage } from './public-profile';
import { AccountSelectorPage } from './pages/AccountSelectorPage';
import { useContextSync } from './hooks/useContextSync';
import { useAccountStore } from './store/accountStore';

function App() {
  const { isAuthenticated, initFromStorage } = useAuthStore();
  const { activeAccountId } = useAccountStore();
  const { resolvedTheme } = useThemeStore();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Sincronización de contexto (Meta-Inspired)
  useContextSync();
  
  useEffect(() => {
    initFromStorage();
    // Pequeño delay para evitar flash de contenido
    const timer = setTimeout(() => setIsInitializing(false), 100);
    return () => clearTimeout(timer);
  }, []); // Empty deps - solo ejecutar una vez al montar

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

  return (
    <>
      <Routes>
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/account-deletions/:jobId" element={<AccountDeletionPortalPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route 
          path="/login" 
          element={!isAuthenticated ? <AuthPage /> : (activeAccountId ? <Navigate to="/" /> : <Navigate to="/select-account" />)} 
        />
        <Route path="/select-account" element={isAuthenticated ? <AccountSelectorPage /> : <Navigate to="/login" />} />
        <Route path="/:alias" element={<PublicProfilePage />} />
        <Route path="/:alias/plantillas" element={<PublicProfilePage />} />
        <Route path="/:alias/base_de_conocimiento" element={<PublicProfilePage />} />
        <Route 
          path="/@/:alias/*" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/select-account" /> : <Navigate to="/login" />} 
        />
      </Routes>
    </>
  );
}

export default App;
