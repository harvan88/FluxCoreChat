import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Check,
  Instagram,
  Globe,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Plus
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import type { BrandColors } from '../../hooks/useProfile';
import { useLocations } from '../../hooks/useLocations';
import { Button, Input, Select } from '../ui';
import { Switch } from '../ui/Switch';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { DoubleConfirmationDeleteButton } from '../ui/DoubleConfirmationDeleteButton';

interface ContactSectionProps {
  // onBack removed - header button removed
}

type ContactType = 'website' | 'email' | 'whatsapp' | 'phone';
type SocialType = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'x';

const CONTACT_OPTIONS: Record<ContactType, { label: string; icon: any; color: string; placeholder: string }> = {
  website: { label: 'Sitio Web', icon: Globe, color: 'text-accent', placeholder: 'https://tu-sitio.com' },
  email: { label: 'Correo', icon: Mail, color: 'text-primary', placeholder: 'tu@correo.com' },
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-green-500', placeholder: '+54 9 11 1234-5678' },
  phone: { label: 'Teléfono', icon: Phone, color: 'text-primary', placeholder: '011 4567-8910' },
};

const SOCIAL_OPTIONS: Record<SocialType, { label: string; icon: any; color: string; placeholder: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-500', placeholder: 'usuario' },
  facebook: { label: 'Facebook', icon: Globe, color: 'text-blue-600', placeholder: 'usuario' },
  tiktok: { 
    label: 'TikTok', 
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
      </svg>
    ), 
    color: 'text-primary', 
    placeholder: 'usuario' 
  },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', placeholder: 'perfil' },
  x: { label: 'X', icon: Twitter, color: 'text-primary', placeholder: 'usuario' },
};

export function ContactSection({}: ContactSectionProps) {
  const {
    profile,
    isLoading: isProfileLoading,
    isSaving: isProfileSaving,
    error: profileError,
    updateProfile,
  } = useProfile();

  const {
    defaultLocation,
    isLoading: isLocationLoading,
    error: locationError,
    updateLocation,
    ensureDefaultLocation,
  } = useLocations();

  const [socialLinks, setSocialLinks] = useState<Record<string, { value: string; aiEnabled: boolean; label?: string }>>({});
  const [locationContact, setLocationContact] = useState({ phone: '', email: '' });
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  
  const [showNewSocialRow, setShowNewSocialRow] = useState(false);

  useEffect(() => {
    if (profile) {
      setSocialLinks((profile as any).socialLinks || {});
      setPrimaryColor(profile.brandColors?.primary || '#6366f1');
    }
  }, [profile]);

  useEffect(() => {
    if (defaultLocation) {
      setLocationContact({
        phone: defaultLocation.phone || '',
        email: defaultLocation.email || '',
      });
    }
  }, [defaultLocation]);

  useEffect(() => {
    if (profile && (defaultLocation !== undefined)) {
      const currentSocials = JSON.stringify((profile as any).socialLinks || {});
      const nextSocials = JSON.stringify(socialLinks);
      
      const socialsChanged = currentSocials !== nextSocials;
      const contactChanged = 
        locationContact.phone !== (defaultLocation?.phone || '') ||
        locationContact.email !== (defaultLocation?.email || '');
      const colorChanged = primaryColor !== (profile.brandColors?.primary || '#6366f1');
        
      setHasChanges(socialsChanged || contactChanged || colorChanged);
    }
  }, [socialLinks, locationContact, primaryColor, profile, defaultLocation]);

  const handleSocialChange = (key: string, field: 'value' | 'aiEnabled', value: any) => {
    setSocialLinks(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleLocationContactChange = (field: 'phone' | 'email', value: string) => {
    setLocationContact(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveSocial = (key: string) => {
    setSocialLinks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddSocial = (type: SocialType) => {
    const opt = SOCIAL_OPTIONS[type];
    setSocialLinks(prev => ({
      ...prev,
      [type]: { value: '', aiEnabled: true, label: opt.label }
    }));
    setShowNewSocialRow(false);
  };

  const handleSave = async () => {
    setIsLocalSaving(true);
    // 1. Asegurar que existe la sede por defecto si vamos a guardar datos de contacto
    let targetLocation = defaultLocation;
    if (!targetLocation) {
      targetLocation = await ensureDefaultLocation();
    }

    if (!targetLocation) {
      console.error('No se pudo determinar la sede para guardar el contacto');
      setIsLocalSaving(false);
      return;
    }

    // 2. Guardar perfil (Social Links + Colores)
    const brandColors: BrandColors = {
      primary: primaryColor,
    };

    const cleanedSocialLinks: any = {};
    Object.entries(socialLinks).forEach(([k, v]) => {
      if (v.value.trim() !== '') {
        cleanedSocialLinks[k] = {
          ...v,
          value: v.value.trim()
        };
      }
    });

    const profileSuccess = await updateProfile({
      socialLinks: cleanedSocialLinks,
      brandColors,
      aiIncludeSocialLinks: true,
    });

    // 3. Guardar contacto en la sede
    const locationSuccess = await updateLocation(targetLocation.id, {
      phone: locationContact.phone,
      email: locationContact.email,
    });

    if (profileSuccess && locationSuccess) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setHasChanges(false);
    }
    setIsLocalSaving(false);
  };

  const renderContactField = (key: ContactType) => {
    const opt = CONTACT_OPTIONS[key];
    const Icon = opt.icon;
    
    if (key === 'website') {
      const data = socialLinks['website'] || { value: '', aiEnabled: true };
      return (
        <div key={key} className="flex items-center gap-3 py-2">
          <div className="w-32 flex items-center gap-2 flex-shrink-0">
            <Icon size={16} className={opt.color} />
            <span className="text-sm font-medium text-primary">{opt.label}</span>
          </div>
          <Input
            type="text"
            value={data.value}
            onChange={(e) => handleSocialChange('website', 'value', e.target.value)}
            placeholder={opt.placeholder}
            className="flex-1"
          />
          <div 
            className={`flex items-center gap-1.5 px-2 h-9 rounded-lg transition-colors ${
              data.aiEnabled ? 'bg-accent/10 text-accent' : 'text-muted'
            }`}
          >
            <span className="text-[10px] font-bold text-muted">IA</span>
            <Switch 
              checked={data.aiEnabled}
              onCheckedChange={(v) => handleSocialChange('website', 'aiEnabled', v)}
              size="sm"
            />
          </div>
        </div>
      );
    }

    const value = locationContact[key as 'phone' | 'email'] || '';
    
    return (
      <div key={key} className="flex items-center gap-3 py-2">
        <div className="w-32 flex items-center gap-2 flex-shrink-0">
          <Icon size={16} className={opt.color} />
          <span className="text-sm font-medium text-primary">{opt.label}</span>
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => handleLocationContactChange(key as 'phone' | 'email', e.target.value)}
          placeholder={opt.placeholder}
          className="flex-1"
        />
        <div className="w-[60px]" /> 
      </div>
    );
  };

  const renderSocialField = (key: string, data: { value: string; aiEnabled: boolean; label?: string }) => {
    const opt = SOCIAL_OPTIONS[key as SocialType] || { label: data.label || key, icon: Globe, color: 'text-primary', placeholder: 'usuario' };
    const Icon = opt.icon;
    
    return (
      <div key={key} className="flex items-center gap-3 py-2">
        <div className="w-32 flex items-center gap-2 flex-shrink-0">
          <Icon size={16} className={opt.color} />
          <span className="text-sm font-medium text-primary">{opt.label}</span>
        </div>
        <Input
          type="text"
          value={data.value}
          onChange={(e) => handleSocialChange(key, 'value', e.target.value)}
          placeholder={opt.placeholder}
          className="flex-1"
        />
        <div 
          className={`flex items-center gap-1.5 px-2 h-9 rounded-lg transition-colors ${
            data.aiEnabled ? 'bg-accent/10 text-accent' : 'text-muted'
          }`}
        >
          <span className="text-[10px] font-bold text-muted">IA</span>
          <Switch 
            checked={data.aiEnabled}
            onCheckedChange={(v) => handleSocialChange(key, 'aiEnabled', v)}
            size="sm"
          />
        </div>
        <DoubleConfirmationDeleteButton 
          onConfirm={() => handleRemoveSocial(key)} 
          className="h-9 w-9"
        />
      </div>
    );
  };

  const isLoading = isProfileLoading || isLocationLoading;
  const isSaving = isProfileSaving || isLocalSaving;
  const error = profileError || locationError;

  if (isLoading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex-shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="space-y-1">
          <CollapsibleSection title="Datos de Contacto" defaultExpanded={true} showToggle={false}>
            <div className="space-y-3 pt-2">
              {renderContactField('website')}
              {renderContactField('email')}
              {renderContactField('phone')}
              
              <div className="flex items-center justify-end py-2">
                <p className="text-[10px] text-muted">Los datos de contacto se asocian a tu sede principal</p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Redes Sociales" defaultExpanded={true} showToggle={false}>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-end py-2">
                <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewSocialRow(true)}>
                  Añadir red social
                </Button>
              </div>
              
              {showNewSocialRow && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-32 flex-shrink-0">
                    <Select
                      options={[
                        { value: 'instagram', label: 'Instagram' },
                        { value: 'facebook', label: 'Facebook' },
                        { value: 'tiktok', label: 'TikTok' },
                        { value: 'linkedin', label: 'LinkedIn' },
                        { value: 'x', label: 'X' },
                      ].filter(opt => !socialLinks[opt.value])}
                      placeholder="Elegir..."
                      onChange={(value: string | string[]) => handleAddSocial(value as SocialType)}
                    />
                  </div>
                  <Input type="text" placeholder="Selecciona una red social" className="flex-1" disabled />
                  <div className="flex items-center gap-1.5 px-2 h-9 rounded-lg text-muted">
                    <span className="text-[10px] font-bold text-muted">IA</span>
                    <Switch size="sm" checked={false} onCheckedChange={() => {}} disabled />
                  </div>
                  <DoubleConfirmationDeleteButton onConfirm={() => setShowNewSocialRow(false)} className="h-9 w-9" />
                </div>
              )}
              
              <div className="space-y-3">
                {Object.entries(socialLinks)
                  .filter(([k]) => k !== 'website')
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([k, v]) => renderSocialField(k, v))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Identidad Visual" defaultExpanded={true} showToggle={false}>
            <div className="pt-2">
              <div className="space-y-2">
                <p className="text-xs text-muted">Color principal de tu marca para personalización.</p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="w-10 h-10 rounded border border-subtle shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                  <div className="w-32">
                    <Input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
      
      <div className="p-4 border-t border-subtle bg-background flex-shrink-0">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <><Loader2 size={16} className="animate-spin mr-2" /> Guardando...</>
          ) : saveSuccess ? (
            <><Check size={16} className="mr-2" /> Guardado Correctamente</>
          ) : (
            <><Save size={16} className="mr-2" /> Guardar cambios</>
          )}
        </Button>
      </div>
    </div>
  );
}
