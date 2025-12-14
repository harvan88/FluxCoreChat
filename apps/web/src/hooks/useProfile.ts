/**
 * FC-807: useProfile Hook
 * CRUD de perfil conectado a API real
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import type { Account } from '../types';

export interface ProfileData {
  displayName: string;
  bio: string;
  privateContext: string;
  accountType: 'personal' | 'business';
  avatarUrl?: string;
  profile: {
    bio?: string;
    contact?: {
      phone?: string;
      address?: string;
      hours?: string;
    };
    business?: {
      services?: string[];
      policies?: string[];
    };
  };
}

export interface UseProfileReturn {
  profile: ProfileData | null;
  account: Account | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<boolean>;
  updateBio: (bio: string) => Promise<boolean>;
  updateDisplayName: (name: string) => Promise<boolean>;
  updatePrivateContext: (context: string) => Promise<boolean>;
  convertToBusiness: () => Promise<boolean>;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuthStore();
  const { selectedAccountId } = useUIStore();
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(null);

  // Load profile from API
  const loadProfile = useCallback(async () => {
    if (!user || isLoading) return; // Prevent concurrent calls
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.getAccounts();
      
      if (response.success && response.data && response.data.length > 0) {
        // BUG FIX: Get the SELECTED account, not always the first one
        let targetAccount = response.data[0]; // fallback to first
        
        if (selectedAccountId) {
          const selected = response.data.find(acc => acc.id === selectedAccountId);
          if (selected) {
            targetAccount = selected;
          }
        }
        
        setAccount(targetAccount);
        setLoadedAccountId(targetAccount.id);
        
        // Map account to profile data
        const profileData: ProfileData = {
          displayName: targetAccount.displayName || '',
          bio: targetAccount.profile?.bio || '',
          privateContext: targetAccount.privateContext || '',
          accountType: targetAccount.accountType as 'personal' | 'business',
          avatarUrl: targetAccount.profile?.avatarUrl,
          profile: targetAccount.profile || {},
        };
        
        setProfile(profileData);
      } else {
        setError(response.error || 'No se encontraron cuentas');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar perfil');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user, isLoading, selectedAccountId]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<ProfileData>): Promise<boolean> => {
    if (!account) return false;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const updateData: Partial<Account> = {};
      
      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }
      
      if (data.privateContext !== undefined) {
        updateData.privateContext = data.privateContext;
      }
      
      if (data.bio !== undefined || data.profile !== undefined || data.avatarUrl !== undefined) {
        updateData.profile = {
          ...account.profile,
          ...data.profile,
          ...(data.bio !== undefined ? { bio: data.bio } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        };
      }
      
      const response = await api.updateAccount(account.id, updateData);
      
      if (response.success && response.data) {
        setAccount(response.data);
        setProfile(prev => prev ? { ...prev, ...data } : null);
        return true;
      } else {
        setError(response.error || 'Error al guardar');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [account]);

  // Convenience methods
  const updateBio = useCallback(async (bio: string): Promise<boolean> => {
    return updateProfile({ bio });
  }, [updateProfile]);

  const updateDisplayName = useCallback(async (name: string): Promise<boolean> => {
    return updateProfile({ displayName: name });
  }, [updateProfile]);

  const updatePrivateContext = useCallback(async (context: string): Promise<boolean> => {
    return updateProfile({ privateContext: context });
  }, [updateProfile]);

  const convertToBusiness = useCallback(async (): Promise<boolean> => {
    if (!account) return false;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Usar el endpoint real de conversión a negocio
      const response = await api.convertToBusiness(account.id);
      
      if (response.success && response.data) {
        setAccount(response.data);
        setProfile(prev => prev ? { ...prev, accountType: 'business' } : null);
        return true;
      } else {
        setError(response.error || 'Error al convertir a negocio');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Error al convertir a negocio');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [account]);

  // Load profile on mount - solo una vez cuando el usuario está disponible
  useEffect(() => {
    if (user && !hasLoaded && !isLoading) {
      loadProfile();
    }
  }, [user, hasLoaded, isLoading, loadProfile]);

  // BUG FIX: Reload when selectedAccountId changes
  useEffect(() => {
    if (selectedAccountId && loadedAccountId && selectedAccountId !== loadedAccountId) {
      console.log('[useProfile] Account changed, reloading profile:', selectedAccountId);
      setHasLoaded(false);
      setProfile(null);
      setAccount(null);
    }
  }, [selectedAccountId, loadedAccountId]);

  return {
    profile,
    account,
    isLoading,
    isSaving,
    error,
    loadProfile,
    updateProfile,
    updateBio,
    updateDisplayName,
    updatePrivateContext,
    convertToBusiness,
  };
}
