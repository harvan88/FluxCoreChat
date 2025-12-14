import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarSize } from '../ui/Avatar';
import { api } from '../../services/api';
import { useAccountStore } from '../../store/accountStore';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  name?: string;
  onUpload: (url: string) => void;
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
  const { activeAccount, loadAccounts } = useAccountStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    // Validate size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await api.uploadAvatar(file, activeAccount?.id);
      if (response.success && response.data) {
        // Construct full URL if returned relative
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = response.data.url.startsWith('http') 
          ? response.data.url 
          : `${apiUrl}${response.data.url}`;
          
        onUpload(url);
        
        // Refresh accounts to get updated avatar in AccountSwitcher
        if (activeAccount) {
          console.log('[AvatarUpload] Refreshing accounts to update avatar');
          loadAccounts();
        }
      } else {
        setError(response.error || 'Error al subir la imagen');
      }
    } catch (err) {
      setError('Error al subir la imagen');
      console.error(err);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
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
      />
      
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
      
      <span className="text-sm text-muted">Cambiar foto</span>
    </div>
  );
}
