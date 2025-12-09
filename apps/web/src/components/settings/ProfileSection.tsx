/**
 * FC-800: ProfileSection - Sección completa de perfil
 * Incluye: BioEditor (FC-801), AIContextEditor (FC-803), BusinessToggle (FC-806)
 */

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  Camera,
  Save,
  Loader2,
  Sparkles,
  Building2,
  Maximize2,
  Copy,
  Download,
  Check,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { usePanelStore } from '../../store/panelStore';
import { Button, Input, Card } from '../ui';

interface ProfileSectionProps {
  onBack: () => void;
}

export function ProfileSection({ onBack }: ProfileSectionProps) {
  const {
    profile,
    isLoading,
    isSaving,
    error,
    updateProfile,
  } = useProfile();
  
  const { openTab } = usePanelStore();

  // Local state for form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [privateContext, setPrivateContext] = useState('');
  const [isBusinessEnabled, setIsBusinessEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle open expanded editor
  const handleOpenExpandedEditor = () => {
    openTab('editor', {
      type: 'editor',
      title: 'Contexto para IA',
      closable: true,
      context: {
        title: 'Contexto para la IA',
        content: privateContext,
        maxLength: 5000,
        placeholder: 'Escribe aquí el contexto que usará la IA para comunicarse mejor contigo...',
        onSave: (newContent: string) => {
          setPrivateContext(newContent);
        },
        onClose: () => {},
      },
    });
  };

  // Sync local state with profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setPrivateContext(profile.privateContext || '');
      setIsBusinessEnabled(profile.accountType === 'business');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed =
        displayName !== (profile.displayName || '') ||
        bio !== (profile.bio || '') ||
        privateContext !== (profile.privateContext || '');
      setHasChanges(changed);
    }
  }, [displayName, bio, privateContext, profile]);

  // Handle save
  const handleSave = async () => {
    const success = await updateProfile({
      displayName,
      bio,
      privateContext,
    });
    
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // Handle copy context
  const handleCopyContext = () => {
    navigator.clipboard.writeText(privateContext);
  };

  // Handle download context
  const handleDownloadContext = () => {
    const blob = new Blob([privateContext], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contexto-ia.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate tokens (approximate)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Perfil</span>
      </button>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center">
              <span className="text-inverse font-bold text-3xl">
                {displayName?.charAt(0) || 'U'}
              </span>
            </div>
            <button
              className="absolute bottom-0 right-0 w-8 h-8 bg-surface border border-default rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-hover transition-colors"
              title="Cambiar foto"
            >
              <Camera size={16} />
            </button>
          </div>
          <span className="text-sm text-muted">Cambiar foto</span>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">Nombre visible</label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full"
          />
        </div>

        {/* Bio / Presentación (FC-801) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">Presentación</label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              placeholder="Esta presentación la verán las personas que visiten tu perfil"
              className="w-full h-24 px-3 py-2 bg-elevated border border-default rounded-lg text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              maxLength={150}
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted">
              {bio.length}/150
            </div>
          </div>
        </div>

        {/* Business Toggle (FC-806) */}
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-secondary" />
              <div>
                <div className="text-primary font-medium">Cuenta de negocio</div>
                <div className="text-sm text-muted">Activa funciones empresariales</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBusinessEnabled}
                onChange={(e) => setIsBusinessEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
          {isBusinessEnabled && (
            <div className="mt-3 pt-3 border-t border-subtle">
              <a
                href="#accounts"
                className="text-sm text-accent hover:underline"
              >
                Ir a configuración de cuentas →
              </a>
            </div>
          )}
        </Card>

        {/* AI Context Editor (FC-803) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              Contexto para la IA
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyContext}
                className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded transition-colors"
                title="Copiar"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={handleDownloadContext}
                className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded transition-colors"
                title="Descargar"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleOpenExpandedEditor}
                className="p-1.5 text-muted hover:text-primary hover:bg-hover rounded transition-colors"
                title="Expandir editor"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={privateContext}
              onChange={(e) => setPrivateContext(e.target.value.slice(0, 5000))}
              placeholder="Esta información no la verán las personas que visiten tu perfil. Es contexto que usará la IA para comunicarse mejor contigo. Ej: ¿Cómo te gusta que te hablen?, ¿sobre qué temas?, ¿te gustan los emojis?, ¿prefieres un trato formal?"
              className="w-full h-40 px-3 py-2 bg-elevated border border-default rounded-lg text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono text-sm"
              maxLength={5000}
            />
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{privateContext.split('\n').length} líneas • ~{estimateTokens(privateContext)} tokens</span>
            <span>{privateContext.length}/5000</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-subtle">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Guardando...
              </>
            ) : saveSuccess ? (
              <>
                <Check size={16} className="mr-2" />
                Guardado
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
