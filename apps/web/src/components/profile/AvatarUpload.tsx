import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarSize } from '../ui/Avatar';
import { api } from '../../services/api';
import { useAccountStore } from '../../store/accountStore';
import { useUIStore } from '../../store/uiStore';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  name?: string;
  onUpload: (result: { url: string; assetId: string }) => void | Promise<void>;
  size?: AvatarSize;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  name, 
  onUpload,
  size = '2xl' 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadAccounts = useAccountStore((state) => state.loadAccounts);
  const updateAccountState = useAccountStore((state) => state.updateAccountState);
  const updateUiAccount = useUIStore((state) => state.updateAccount);
  const isMountedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const log = (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data);
    }
  };

  const logError = (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(message, data);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Block multiple uploads
    if (isUploading) {
      resetInput();
      return;
    }

    log('[AvatarUpload] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      logError('[AvatarUpload] Invalid file type:', file.type);
      setError('Solo se permiten imágenes');
      resetInput();
      return;
    }

    // Validate size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      logError('[AvatarUpload] File too large:', file.size);
      setError('La imagen no debe superar los 5MB');
      resetInput();
      return;
    }

    // Get current state directly from store
    const state = useAccountStore.getState();
    log('[AvatarUpload] Current store state:', {
      activeAccountId: state.activeAccountId,
      accountsCount: state.accounts.length,
      hasActiveAccount: !!state.activeAccount
    });

    // Try to get active account manually
    let currentActiveAccount = state.accounts.find((a) => a.id === state.activeAccountId);
    
    // If no active account found, try to load accounts first
    if (!currentActiveAccount?.id) {
      log('[AvatarUpload] No active account found, attempting to load accounts...');
      try {
        await loadAccounts();
        
        // Check again after loading
        const updatedState = useAccountStore.getState();
        currentActiveAccount = updatedState.accounts.find((a) => a.id === updatedState.activeAccountId);
        
        log('[AvatarUpload] After loading accounts:', {
          activeAccountId: updatedState.activeAccountId,
          accountsCount: updatedState.accounts.length,
          foundAccount: !!currentActiveAccount,
          accountName: currentActiveAccount?.displayName
        });
      } catch (error) {
        logError('[AvatarUpload] Failed to load accounts:', error);
        setError('Error al cargar cuentas');
        resetInput();
        return;
      }
    }

    // Final validation
    if (!currentActiveAccount?.id) {
      logError('[AvatarUpload] Still no active account after reload');
      setError('No hay cuenta activa seleccionada');
      resetInput();
      return;
    }

    // Validate ownerUserId
    if (!currentActiveAccount.ownerUserId) {
      logError('[AvatarUpload] No ownerUserId found in account');
      setError('Error: la cuenta no tiene un usuario propietario válido');
      resetInput();
      return;
    }

    log('[AvatarUpload] All validations passed, starting upload for account:', currentActiveAccount.id);

    setIsUploading(true);
    setError(null);

    const safeAwait = async function<T>(promise: Promise<T>, label: string): Promise<T | undefined> {
      try {
        return await promise;
      } catch (err) {
        logError(`[AvatarUpload] ${label} failed`, err);
        return undefined;
      }
    };

    try {
      log('[AvatarUpload] Step 1: Creating upload session...');
      
      const response = await api.uploadAvatarAsset({
        accountId: currentActiveAccount.id,
        file,
        uploadedBy: currentActiveAccount.ownerUserId,
      });
      
      log('[AvatarUpload] Step 1 Result:', {
        success: response.success,
        error: response.error,
        data: response.data
      });
      
      if (response.success && response.data) {
        // Validate URL exists
        if (!response.data.url) {
          logError('[AvatarUpload] No URL returned from upload');
          setError('Error: no se recibió la URL del avatar');
          return;
        }

        log('[AvatarUpload] Step 2: Asset uploaded successfully:', {
          assetId: response.data.assetId,
          url: response.data.url
        });
        
        // Update account avatar with assetId
        log('[AvatarUpload] Step 3: Updating account avatar...');
        const updateResponse = await api.updateAccountAvatar({
          accountId: currentActiveAccount.id,
          avatarAssetId: response.data.assetId,
        });
        
        log('[AvatarUpload] Step 3 Result:', {
          success: updateResponse.success,
          error: updateResponse.error,
          fullResponse: updateResponse
        });
        
        if (updateResponse.success) {
          log('[AvatarUpload] Step 4: Upload completed successfully');
          if (isMountedRef.current) {
            updateAccountState(currentActiveAccount.id, {
              avatarAssetId: response.data.assetId,
              profile: {
                ...(currentActiveAccount.profile || {}),
                avatarUrl: response.data.url,
              },
            });

            updateUiAccount(currentActiveAccount.id, {
              avatarAssetId: response.data.assetId,
              profile: {
                ...(currentActiveAccount.profile || {}),
                avatarUrl: response.data.url,
              },
            });
          }

          if (isMountedRef.current) {
            log('[AvatarUpload] Step 5: Refreshing accounts to update avatar');
            void safeAwait(loadAccounts(), 'loadAccounts refresh');
          }

          // Only call onUpload if component is still mounted
          if (isMountedRef.current) {
            void safeAwait(
              Promise.resolve(
                onUpload({
                  url: response.data.url,
                  assetId: response.data.assetId,
                })
              ),
              'onUpload callback'
            );
          }
        } else {
          logError('[AvatarUpload] Step 3 Failed:', updateResponse.error ?? 'Error desconocido');
          if (isMountedRef.current) {
            setError(updateResponse.error || 'Error al actualizar avatar en la cuenta');
          }
        }
      } else {
        logError('[AvatarUpload] Step 1 Failed:', response.error);
        if (isMountedRef.current) {
          setError(response.error || 'Error al subir la imagen');
        }
      }
    } catch (err) {
      logError('[AvatarUpload] Upload exception:', err);
      if (isMountedRef.current) {
        setError('Error al subir la imagen');
      }
    } finally {
      log('[AvatarUpload] Upload process finished');
      if (isMountedRef.current) {
        setIsUploading(false);
      }
      resetInput();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group cursor-pointer" onClick={handleClick}>
        <Avatar 
          src={currentAvatarUrl} 
          name={name} 
          size={size}
          className={isUploading ? 'opacity-50' : ''}
        />
        
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-white" size={24} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Camera className="text-white" size={24} />
          </div>
        )}

        <button
          type="button"
          className="absolute bottom-0 right-0 w-8 h-8 bg-surface border border-default rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-hover transition-colors shadow-sm z-20"
          title="Cambiar foto"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <Camera size={16} />
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
      
      {error && (
        <span className="text-xs text-error font-medium">{error}</span>
      )}
      
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="text-sm text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cambiar foto
      </button>
    </div>
  );
}
