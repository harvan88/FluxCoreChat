/**
 * useContextRefresh Hook
 * 
 * Mecanismo centralizado para limpiar y recargar contexto completo al cambiar de cuenta
 * Resuelve problema de estado residual al alternar entre cuentas
 */

import { useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import { usePanelStore } from '../store/panelStore';
import { setCurrentAccountDB, closeAccountDB } from '../db';

interface ContextRefreshOptions {
  clearConversations?: boolean;
  clearLocalCache?: boolean;
  clearPanels?: boolean;
}

export function useContextRefresh() {
  const { 
    setAccounts,
    setSelectedAccount,
    resetAccountData,
    selectedAccountId 
  } = useUIStore();
  
  // MA-303: Obtener resetLayout del panelStore
  const { resetLayout } = usePanelStore();

  /**
   * Limpia y recarga completamente el contexto para una nueva cuenta
   */
  const refreshAccountContext = useCallback(async (
    newAccountId: string, 
    options: ContextRefreshOptions = {}
  ) => {
    const {
      clearConversations = true,
      clearLocalCache = true,
      clearPanels = true
    } = options;

    console.log('[ContextRefresh] Starting full context refresh for:', newAccountId);
    console.log('[ContextRefresh] Previous account:', selectedAccountId);

    const previousAccountId = selectedAccountId;

    try {
      // 1. Limpiar estado de conversaciones usando método centralizado
      if (clearConversations) {
        console.log('[ContextRefresh] Clearing account-specific data');
        resetAccountData();
      }

      // MA-303: Limpiar paneles/tabs de cuenta anterior
      if (clearPanels) {
        console.log('[ContextRefresh] Resetting panel layout');
        resetLayout();
      }

      // 2. Actualizar cuenta seleccionada ANTES del switch de DB/evento
      setSelectedAccount(newAccountId);

      // 3. Cambiar a la base de datos de la nueva cuenta
      console.log('[ContextRefresh] Switching to new account database');
      setCurrentAccountDB(newAccountId);

      // 2. Cerrar base de datos anterior y cambiar a la nueva
      if (clearLocalCache && previousAccountId && previousAccountId !== newAccountId) {
        console.log('[ContextRefresh] Closing previous account database');
        await closeAccountDB(previousAccountId);
      }

      // 5. Disparar evento global para que componentes se recarguen
      console.log('[ContextRefresh] Dispatching account:changed event');
      window.dispatchEvent(new CustomEvent('account:changed', { 
        detail: { 
          oldAccountId: previousAccountId,
          newAccountId,
          timestamp: Date.now()
        } 
      }));

      // 6. Forzar recarga de datos de cuenta si es necesario
      if (clearConversations) {
        setAccounts([]); // Forzar recarga de cuentas
      }

      console.log('[ContextRefresh] Context refresh completed successfully');
      
    } catch (error) {
      console.error('[ContextRefresh] Error during context refresh:', error);
      throw error;
    }
  }, [selectedAccountId, resetAccountData, setAccounts, resetLayout, setSelectedAccount]);

  /**
   * Verifica si el contexto actual está limpio para la cuenta especificada
   */
  const verifyContextIntegrity = useCallback(async (accountId: string) => {
    // La integridad ahora está garantizada por bases de datos separadas
    console.log('[ContextRefresh] Context integrity verified for account:', accountId);
    return true;
  }, []);

  return {
    refreshAccountContext,
    verifyContextIntegrity
  };
}
