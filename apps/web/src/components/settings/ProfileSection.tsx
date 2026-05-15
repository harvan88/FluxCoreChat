/**
 * FC-800: ProfileSection - Sección completa de perfil
 * Incluye: BioEditor (FC-801), AIContextEditor (FC-803), BusinessToggle (FC-806)
 * Real-time authorized locations presence (Fase 2)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Save,
  Loader2,
  Maximize2,
  Copy,
  Check,
  Link,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Truck,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useLocations } from '../../hooks/useLocations';
import { getApiUrl } from '../../utils/urls';
import { usePanelStore } from '../../store/panelStore';
import { Button, Input, Card, Textarea, CopyButton, SearchFirstSelector } from '../ui';
import { Switch } from '../ui/Switch';
import { AvatarUpload } from '../profile/AvatarUpload';
import { IdCopyable } from '../fluxcore/detail/IdCopyable';
import { getUnifiedRegionalOptions } from '../../utils/regional';

const REGIONAL_OPTIONS = getUnifiedRegionalOptions();

interface ProfileSectionProps {
  onBack?: () => void;
}

export function ProfileSection({ onBack }: ProfileSectionProps) {
  const {
    profile,
    account,
    isLoading: isProfileLoading,
    isSaving,
    error: profileError,
    updateProfile,
    loadProfile,
  } = useProfile();

  const {
    locations,
    isLoading: isLocationsLoading,
  } = useLocations();

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
  const [aiIncludeTimestamp, setAiIncludeTimestamp] = useState(true);
  const [aiIncludeLocations, setAiIncludeLocations] = useState(true);
  const [aiIncludeSchedule, setAiIncludeSchedule] = useState(true);
//   const [isBusinessEnabled, setIsBusinessEnabled] = useState(false);
  const [alias, setAlias] = useState('');
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'current'>('idle');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [aliasMessage, setAliasMessage] = useState<string | null>(null);
  const aliasCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const API_URL = getApiUrl();

  // Debounced alias availability check
  const checkAliasAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setAliasStatus('idle');
      setAliasMessage(null);
      return;
    }
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
      setAiIncludeTimestamp(profile.aiIncludeTimestamp ?? true);
      setAiIncludeLocations(account?.aiIncludeLocations ?? true);
      setAiIncludeSchedule(profile.aiIncludeSchedule ?? account?.aiIncludeLocations ?? true);
//       setIsBusinessEnabled(profile.accountType === 'business');
      setCountry(profile.country || '');
      setTimezone(profile.timezone || '');
    }
  }, [profile, account]);

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
        aiIncludePrivateContext !== (profile.aiIncludePrivateContext ?? true) ||
        aiIncludeTimestamp !== (profile.aiIncludeTimestamp ?? true) ||
        aiIncludeLocations !== (account?.aiIncludeLocations ?? true) ||
        aiIncludeSchedule !== (profile.aiIncludeSchedule ?? account?.aiIncludeLocations ?? true) ||
        country !== (profile.country || '') ||
        timezone !== (profile.timezone || '');
      setHasChanges(changed);
    }
  }, [displayName, bio, alias, avatarAssetId, privateContext, allowAutomatedUse, aiIncludeName, aiIncludeBio, aiIncludePrivateContext, aiIncludeLocations, aiIncludeSchedule, country, timezone, profile, account]);

  const handleSave = async () => {
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
      aiIncludeTimestamp,
      aiIncludeLocations,
      aiIncludeSchedule,
      country,
      timezone,
    };
    if (alias !== (account?.alias || '')) {
      updateData.alias = alias || null;
    }
    const success = await updateProfile(updateData);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleCopyContext = () => {
    navigator.clipboard.writeText(privateContext);
  };

//   const handleDownloadContext = () => {
//     const blob = new Blob([privateContext], { type: 'text/plain' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'contexto-ia.txt';
//     a.click();
//     URL.revokeObjectURL(url);
//   };

  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  if (isProfileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors flex-shrink-0"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Perfil</span>
      </button>

      {/* Error message */}
      {(profileError) && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex-shrink-0">
          {profileError}
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
              loadProfile();
            }}
          />

          {/* Account ID */}
          {account && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Id de cuenta</span>
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
                <span className="text-muted text-sm" style={{minWidth: '100px'}}>meetgar.com/</span>
              </div>
              <input
                type="text"
                value={alias}
                onChange={(e) => handleAliasChange(e.target.value)}
                placeholder="tu-alias"
                className="w-full pl-[110px] pr-20 py-2 rounded-lg border border-subtle bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                maxLength={30}
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <div className="flex items-center pr-2">
                  {aliasStatus === 'checking' && <Loader2 size={16} className="animate-spin text-muted" />}
                  {aliasStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
                  {aliasStatus === 'current' && <Check size={16} className="text-blue-500" />}
                  {(aliasStatus === 'taken' || aliasStatus === 'reserved') && <XCircle size={16} className="text-red-500" />}
                  {aliasStatus === 'invalid' && <AlertCircle size={16} className="text-amber-500" />}
                </div>
                <CopyButton 
                  text={alias}
                  disabled={!alias || alias.length < 3}
                  title="Copiar"
                  size="sm"
                  className="ml-2"
                />
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
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">Nombre visible</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted font-semibold">IA</span>
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

          {/* Regional Settings Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted">Configuración regional (SSOT)</h3>
              {country && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                  <span className="text-[10px] font-bold text-accent">{country}</span>
                </div>
              )}
            </div>
            
            <SearchFirstSelector
              label="Ubicación y Zona Horaria"
              value={timezone}
              options={REGIONAL_OPTIONS}
              onSelect={(val) => {
                const opt = REGIONAL_OPTIONS.find(o => o.value === val);
                if (opt) {
                  setTimezone(opt.value);
                  setCountry(opt.country);
                }
              }}
              renderValue={(val) => {
                const opt = REGIONAL_OPTIONS.find(o => o.value === val);
                return opt ? `${opt.label} - ${opt.secondaryLabel}` : val;
              }}
              placeholder="Ej: Argentina, España, México..."
              searchPlaceholder="Busca tu país o ciudad principal..."
            />

            <p className="text-[10px] text-muted leading-relaxed italic">
              * Unificamos País y Zona Horaria como Fuente Única de Verdad para todos tus procesos automáticos.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">Presentación</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted font-semibold">IA</span>
                <Switch
                  checked={aiIncludeBio}
                  onCheckedChange={setAiIncludeBio}
                />
              </div>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              placeholder="Descripción pública..."
              rows={3}
              maxLength={150}
              helperText={`${bio.length}/150`}
            />
          </div>

          {/* AI Context Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">Contexto privado para IA</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
                  <button onClick={handleCopyContext} className="p-1.5 text-muted hover:text-primary rounded"><Copy size={14} /></button>
                  <button onClick={handleOpenExpandedEditor} className="p-1.5 text-muted hover:text-primary rounded"><Maximize2 size={14} /></button>
                </div>
                <div className="h-4 w-px bg-subtle mx-1" />
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-[10px] text-muted font-semibold">IA</span>
                  <Switch checked={aiIncludePrivateContext} onCheckedChange={setAiIncludePrivateContext} />
                </div>
              </div>
            </div>
            <Textarea
              value={privateContext}
              onChange={(e) => setPrivateContext(e.target.value.slice(0, 5000))}
              placeholder="Este contexto ayuda a la IA a entenderte mejor..."
              rows={4}
              maxLength={5000}
              className="font-mono text-sm"
              helperText={`~${estimateTokens(privateContext)} tokens`}
            />
          </div>

          {/* AI Locations Gated Presence */}
          <div className="space-y-3">
            <Card variant="bordered" className={`p-4 border-accent/20 transition-all duration-300 ${aiIncludeLocations ? 'bg-accent/5' : 'bg-hover/20 grayscale'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${aiIncludeLocations ? 'bg-accent/20 text-accent' : 'bg-subtle text-muted'}`}>
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="text-primary font-medium text-sm">Sedes Físicas Autorizadas</div>
                    <div className="text-[11px] text-muted">¿La IA puede mencionar tus locales?</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-semibold">IA</span>
                  <Switch
                    checked={aiIncludeLocations}
                    onCheckedChange={setAiIncludeLocations}
                  />
                </div>
              </div>

              {/* Real-time Authorized List */}
              {aiIncludeLocations && (
                <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="h-px bg-accent/10 mb-3" />
                  {isLocationsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-accent" />
                    </div>
                  ) : locations.filter(l => l.status === 'active').length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {locations.filter(l => l.status === 'active').map((loc) => (
                        <div key={loc.id} className="flex items-center justify-between p-2 rounded bg-background/50 border border-subtle hover:border-accent/30 transition-colors">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" title="En tiempo real" />
                            <div className="overflow-hidden">
                              <p className="text-[11px] font-bold text-primary truncate">{loc.name}</p>
                              <p className="text-[10px] text-muted truncate">{loc.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            <Truck size={10} className="text-muted" />
                            <span className="text-[9px] font-bold text-muted">{loc.serviceType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-center text-muted py-2 italic">Sin sedes activas para mostrar.</p>
                  )}
                </div>
              )}
            </Card>
          </div>
          
          {/* AI Schedule Gated Presence */}
          <div className="space-y-3">
            <Card variant="bordered" className={`p-4 border-accent/20 transition-all duration-300 ${aiIncludeSchedule ? 'bg-accent/5' : 'bg-hover/20 grayscale'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${aiIncludeSchedule ? 'bg-accent/20 text-accent' : 'bg-subtle text-muted'}`}>
                    <span className="text-xs font-bold">📅</span>
                  </div>
                  <div>
                    <div className="text-primary font-medium text-sm">Horarios de Atención</div>
                    <div className="text-[11px] text-muted">¿La IA puede proyectar tus horarios (Digital/Sede)?</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-semibold">IA</span>
                  <Switch
                    checked={aiIncludeSchedule}
                    onCheckedChange={setAiIncludeSchedule}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* AI Timestamp Toggle */}
          <Card variant="bordered" className="p-4 border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                   <span className="text-xs font-bold">⏰</span>
                </div>
                <div>
                  <div className="text-primary font-medium text-sm">Conciencia Temporal</div>
                  <div className="text-[11px] text-muted">La IA sabrá qué hora es ahora.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted font-semibold">IA</span>
                <Switch
                  checked={aiIncludeTimestamp}
                  onCheckedChange={setAiIncludeTimestamp}
                />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="pt-4 border-t border-subtle">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <><Loader2 size={16} className="animate-spin mr-2" /> Guardando...</>
              ) : saveSuccess ? (
                <><Check size={16} className="mr-2" /> Cambios Guardados</>
              ) : (
                <><Save size={16} className="mr-2" /> Guardar Perfil</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
