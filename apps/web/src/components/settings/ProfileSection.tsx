/**
 * FC-800: ProfileSection - Sección completa de perfil
 * Incluye: BioEditor (FC-801), AIContextEditor (FC-803), BusinessToggle (FC-806)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Save,
  Loader2,
  Building2,
  Maximize2,
  Copy,
  Download,
  Check,
  Link,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { usePanelStore } from '../../store/panelStore';
import { Button, Input, Card, Textarea } from '../ui';
import { Switch } from '../ui/Switch';
import { AvatarUpload } from '../profile/AvatarUpload';
import { IdCopyable } from '../fluxcore/detail/IdCopyable';

interface ProfileSectionProps {
  onBack: () => void;
}

export function ProfileSection({ onBack }: ProfileSectionProps) {
  const {
    profile,
    account,
    isLoading,
    isSaving,
    error,
    updateProfile,
    loadProfile,
  } = useProfile();

  const { openTab } = usePanelStore();

  // Local state for form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarAssetId, setAvatarAssetId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [privateContext, setPrivateContext] = useState('');
  const [allowAutomatedUse, setAllowAutomatedUse] = useState(false);
  const [aiIncludeName, setAiIncludeName] = useState(true);
  const [aiIncludeBio, setAiIncludeBio] = useState(true);
  const [aiIncludePrivateContext, setAiIncludePrivateContext] = useState(true);
  const [isBusinessEnabled, setIsBusinessEnabled] = useState(false);
  const [alias, setAlias] = useState('');
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'current'>('idle');
  const [aliasMessage, setAliasMessage] = useState<string | null>(null);
  const aliasCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Debounced alias availability check
  const checkAliasAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setAliasStatus('idle');
      setAliasMessage(null);
      return;
    }
    // If same as current alias, mark as current
    if (account && value === (account.alias || '')) {
      setAliasStatus('current');
      setAliasMessage('Este es tu alias actual.');
      return;
    }
    setAliasStatus('checking');
    setAliasMessage(null);
    try {
      const res = await fetch(`${API_URL}/public/profiles/check-alias/${encodeURIComponent(value)}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.available) {
          setAliasStatus('available');
          setAliasMessage('¡Disponible!');
        } else {
          setAliasStatus(json.data.reason === 'reserved' ? 'reserved' : json.data.reason === 'invalid_format' ? 'invalid' : 'taken');
          setAliasMessage(json.data.message);
        }
      }
    } catch {
      setAliasStatus('idle');
      setAliasMessage('Error al verificar disponibilidad.');
    }
  }, [account, API_URL]);

  const handleAliasChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
    setAlias(cleaned);
    if (aliasCheckTimer.current) clearTimeout(aliasCheckTimer.current);
    if (!cleaned || cleaned.length < 3) {
      setAliasStatus('idle');
      setAliasMessage(cleaned.length > 0 ? 'Mínimo 3 caracteres.' : null);
      return;
    }
    aliasCheckTimer.current = setTimeout(() => checkAliasAvailability(cleaned), 400);
  };

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
        onClose: () => { },
      },
    });
  };

  // Sync local state with profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAlias(account?.alias || '');
      if (account?.alias) {
        setAliasStatus('current');
        setAliasMessage('Este es tu alias actual.');
      }
      setAvatarAssetId(profile.avatarAssetId || '');
      setAvatarUrl(profile.avatarUrl);
      setPrivateContext(profile.privateContext || '');
      setAllowAutomatedUse(profile.allowAutomatedUse || false);
      setAiIncludeName(profile.aiIncludeName ?? true);
      setAiIncludeBio(profile.aiIncludeBio ?? true);
      setAiIncludePrivateContext(profile.aiIncludePrivateContext ?? true);
      setIsBusinessEnabled(profile.accountType === 'business');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed =
        displayName !== (profile.displayName || '') ||
        bio !== (profile.bio || '') ||
        alias !== (account?.alias || '') ||
        avatarAssetId !== (profile.avatarAssetId || '') ||
        privateContext !== (profile.privateContext || '') ||
        allowAutomatedUse !== (profile.allowAutomatedUse || false) ||
        aiIncludeName !== (profile.aiIncludeName ?? true) ||
        aiIncludeBio !== (profile.aiIncludeBio ?? true) ||
        aiIncludePrivateContext !== (profile.aiIncludePrivateContext ?? true);
      setHasChanges(changed);
    }
  }, [displayName, bio, alias, avatarAssetId, privateContext, allowAutomatedUse, aiIncludeName, aiIncludeBio, aiIncludePrivateContext, profile, account]);

  // Handle save
  const handleSave = async () => {
    // Si cualquiera de los permisos granulares está activo, la cuenta está autorizada para uso automatizado
    const isDelegated = aiIncludeName || aiIncludeBio || aiIncludePrivateContext;

    const updateData: any = {
      displayName,
      bio,
      avatarAssetId,
      privateContext,
      allowAutomatedUse: isDelegated,
      aiIncludeName,
      aiIncludeBio,
      aiIncludePrivateContext,
    };
    // Include alias if changed
    if (alias !== (account?.alias || '')) {
      updateData.alias = alias || null;
    }
    const success = await updateProfile(updateData);

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors flex-shrink-0"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Perfil</span>
      </button>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Avatar Section */}
          <AvatarUpload
            currentAvatarUrl={avatarUrl ?? profile?.avatarUrl}
            name={displayName}
            onUpload={({ url, assetId }) => {
              setAvatarUrl(url);
              setAvatarAssetId(assetId);
              console.log('[ProfileSection] Avatar updated:', { url, assetId });
              loadProfile();
            }}
          />

          {/* Account ID */}
          {account && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">ID de Cuenta</span>
              <IdCopyable id={account.id} />
            </div>
          )}

          {/* Alias / Public URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Link size={16} className="text-secondary" />
              Alias público
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-muted text-sm">meetgar.com/p/</span>
              </div>
              <input
                type="text"
                value={alias}
                onChange={(e) => handleAliasChange(e.target.value)}
                placeholder="tu-alias"
                className="w-full pl-[108px] pr-10 py-2 rounded-lg border border-subtle bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                maxLength={30}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {aliasStatus === 'checking' && <Loader2 size={16} className="animate-spin text-muted" />}
                {aliasStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
                {aliasStatus === 'current' && <Check size={16} className="text-blue-500" />}
                {(aliasStatus === 'taken' || aliasStatus === 'reserved') && <XCircle size={16} className="text-red-500" />}
                {aliasStatus === 'invalid' && <AlertCircle size={16} className="text-amber-500" />}
              </div>
            </div>
            {aliasMessage && (
              <p className={`text-xs ${
                aliasStatus === 'available' ? 'text-green-600' :
                aliasStatus === 'current' ? 'text-blue-500' :
                aliasStatus === 'invalid' ? 'text-amber-600' :
                (aliasStatus === 'taken' || aliasStatus === 'reserved') ? 'text-red-500' :
                'text-muted'
              }`}>
                {aliasMessage}
              </p>
            )}
            <p className="text-[11px] text-muted">
              Este será tu enlace público. Las personas podrán visitarte y enviarte mensajes directamente.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">Nombre visible</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">IA</span>
                <Switch
                  checked={aiIncludeName}
                  onCheckedChange={setAiIncludeName}
                />
              </div>
            </div>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          {/* Bio / Presentación (FC-801) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">Presentación</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">IA</span>
                <Switch
                  checked={aiIncludeBio}
                  onCheckedChange={setAiIncludeBio}
                />
              </div>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              placeholder="Esta presentación la verán las personas que visiten tu perfil"
              rows={3}
              maxLength={150}
              helperText={`${bio.length}/150`}
            />
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
              <Switch
                checked={isBusinessEnabled}
                onCheckedChange={setIsBusinessEnabled}
              />
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

          {/* AI Context Editor (FC-803) - Only visible if authorized */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary flex items-center gap-2">
                Contexto para la IA
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
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
                <div className="h-4 w-px bg-subtle mx-1" />
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">IA</span>
                  <Switch
                    checked={aiIncludePrivateContext}
                    onCheckedChange={setAiIncludePrivateContext}
                  />
                </div>
              </div>
            </div>

            <Textarea
              value={privateContext}
              onChange={(e) => setPrivateContext(e.target.value.slice(0, 5000))}
              placeholder="Esta información no la verán las personas que visiten tu perfil. Es el contexto que usará la IA..."
              rows={6}
              maxLength={5000}
              className="font-mono text-sm"
              helperText={`${privateContext.split('\n').length} líneas • ~${estimateTokens(privateContext)} tokens • ${privateContext.length}/5000`}
            />
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
    </div>
  );
}
