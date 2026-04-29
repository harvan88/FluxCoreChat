/**
 * useContextSync Hook
 * 
 * Sincroniza el contexto de Cuenta (a) y Workspace (w) con la URL (Query Params)
 * Inspirado en Meta Business Suite.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useAccountStore } from '../store/accountStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useContextRefresh } from './useContextRefresh';

export function useContextSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuthStore();
  const { selectedAccountId } = useUIStore();
  const { activeAccountId } = useAccountStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { refreshAccountContext } = useContextRefresh();
  
  // Evitar bucles infinitos
  const isSyncing = useRef(false);

  // 1. Sincronización Inicial (URL -> Store)
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    const urlAccountId = searchParams.get('a');
    const urlWorkspaceId = searchParams.get('w');

    const initSync = async () => {
      // Si hay cuenta en URL y no coincide con NINGUNO de los stores, forzar refresh
      const needsSync = urlAccountId && (urlAccountId !== selectedAccountId || urlAccountId !== activeAccountId);

      if (needsSync) {
        console.log('[ContextSync] URL/Store mismatch found, refreshing context:', urlAccountId);
        isSyncing.current = true;
        await refreshAccountContext(urlAccountId!);
        
        if (urlWorkspaceId) {
            useWorkspaceStore.getState().setActiveWorkspace(urlWorkspaceId);
        }
        isSyncing.current = false;
      } else if (!urlAccountId && (selectedAccountId || activeAccountId)) {
        // Si no hay en URL pero sí en Store, actualizar URL (usar cualquiera que esté disponible)
        const currentId = urlAccountId || selectedAccountId || activeAccountId;
        setSearchParams(prev => {
          if (currentId) prev.set('a', currentId);
          if (activeWorkspaceId) prev.set('w', activeWorkspaceId);
          return prev;
        }, { replace: true });
      } else if (!urlAccountId && !selectedAccountId && !activeAccountId && isAuthenticated) {
          // Si no hay nada, redirigir a selector si estamos en una ruta que requiere contexto
          const requiresContext = location.pathname === '/';
          if (requiresContext) {
            console.log('[ContextSync] No context found, redirecting to account selector');
            navigate('/select-account');
          }
      }
    };

    initSync();
  }, [isAuthenticated]);

  // 2. Sincronización Reactiva (Store -> URL)
  useEffect(() => {
    if (isSyncing.current || !isAuthenticated || isInitializing) return;

    const urlAccountId = searchParams.get('a');
    const urlWorkspaceId = searchParams.get('w');

    const currentId = selectedAccountId || activeAccountId;

    if (currentId && currentId !== urlAccountId) {
      setSearchParams(prev => {
        prev.set('a', currentId);
        if (activeWorkspaceId) prev.set('w', activeWorkspaceId);
        return prev;
      }, { replace: true });
    }

    if (activeWorkspaceId && activeWorkspaceId !== urlWorkspaceId) {
      setSearchParams(prev => {
        if (selectedAccountId) prev.set('a', selectedAccountId);
        prev.set('w', activeWorkspaceId);
        return prev;
      }, { replace: true });
    }
  }, [selectedAccountId, activeWorkspaceId, isAuthenticated]);

  return null;
}
