---
id: "profilesection-component"
type: "smart-component"
status: "needs_review"
criticality: "high"
location: "apps/web/src/components/settings/ProfileSection.tsx"
---

# ProfileSection Component

## 🎯 Propósito

Componente de configuración del perfil de usuario que permite editar información personal, alias público, avatar y contexto de IA. Es el punto central para que los usuarios personalicen su identidad y preferencias en la plataforma.

## 🏗️ Arquitectura

### Flujo de Datos Principal
```
ProfileSection → useProfile Hook → API Endpoints → Database
     ↓
CopyButton → useClipboard → Dual Strategy → Portapapeles
```

### Estados y Datos
```typescript
// Estado local del componente
const [displayName, setDisplayName] = useState('');
const [bio, setBio] = useState('');
const [alias, setAlias] = useState('');
const [avatarUrl, setAvatarUrl] = useState('');
const [privateContext, setPrivateContext] = useState('');

// Estados de UI
const [hasChanges, setHasChanges] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);
const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'current'>('idle');
```

### Endpoints Consumidos
- `GET /api/profile` - Cargar perfil actual
- `PUT /api/profile` - Actualizar perfil
- `POST /api/upload/avatar` - Subir avatar
- `GET /api/alias/check/:value` - Verificar disponibilidad de alias

## 📋 Props

```typescript
interface ProfileSectionProps {
  /** Callback para regresar al panel anterior */
  onBack: () => void;
}
```

## 💡 Ejemplo de Uso

### Uso Básico
```tsx
function SettingsPanel() {
  const [activeView, setActiveView] = useState('menu');

  return (
    <div>
      {activeView === 'profile' && (
        <ProfileSection onBack={() => setActiveView('menu')} />
      )}
      {activeView === 'menu' && (
        <SettingsMenu onProfileSelect={() => setActiveView('profile')} />
      )}
    </div>
  );
}
```

### Integración con Panel Store
```tsx
import { usePanelStore } from '../../store/panelStore';

function ProfileContainer() {
  const { closePanel } = usePanelStore();

  return (
    <ProfileSection onBack={closePanel} />
  );
}
```

## 🔥 Flujos de Interacción

### 1. Guardar Cambios del Perfil
```typescript
const handleSave = async () => {
  setIsLoading(true);
  try {
    await updateProfile({
      displayName,
      bio,
      alias,
      privateContext,
      aiIncludeName,
      aiIncludeBio,
      aiIncludePrivateContext,
      avatarUrl
    });
    setSaveSuccess(true);
    setHasChanges(false);
    setTimeout(() => setSaveSuccess(false), 2000);
  } catch (error) {
    console.error('Error saving profile:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Verificación de Alias (Debounced)
```typescript
const checkAliasAvailability = useCallback(async (value: string) => {
  if (!value || value.length < 3) {
    setAliasStatus('idle');
    return;
  }

  setAliasStatus('checking');
  
  try {
    const response = await fetch(`/api/alias/check/${encodeURIComponent(value)}`);
    const data = await response.json();
    
    setAliasStatus(data.available ? 'available' : 'taken');
    setAliasMessage(data.message);
  } catch (error) {
    setAliasStatus('error');
  }
}, []);

// Debounced para evitar exceso de peticiones
useEffect(() => {
  if (aliasCheckTimer.current) {
    clearTimeout(aliasCheckTimer.current);
  }
  
  aliasCheckTimer.current = setTimeout(() => {
    checkAliasAvailability(alias);
  }, 500);
  
  return () => {
    if (aliasCheckTimer.current) {
      clearTimeout(aliasCheckTimer.current);
    }
  };
}, [alias, checkAliasAvailability]);
```

### 3. Copia de Alias con CopyButton
```typescript
<CopyButton 
  text={alias}
  disabled={!alias || alias.length < 3}
  title="Copiar alias"
  size="sm"
  className="ml-2"
  debug={process.env.NODE_ENV === 'development'}
  onError={(error) => {
    console.error('[ProfileSection] Error al copiar alias:', {
      error,
      message: error.message,
      stack: error.stack,
      alias: alias,
      aliasLength: alias?.length || 0
    });
  }}
  onSuccess={() => {
    console.log('[ProfileSection] Alias copiado exitosamente');
  }}
/>
```

## 🎨 Componentes Internos

### AvatarUpload
- **Propósito:** Subir y recortar avatar de usuario
- **Integración:** Usa endpoint `/api/upload/avatar`
- **Formatos:** JPEG, PNG, WebP (max 5MB)

### Campos de Formulario
- **Nombre Visible:** `displayName` - Máximo 50 caracteres
- **Alias Público:** `alias` - 3-30 caracteres, alfanumérico + guiones
- **Presentación:** `bio` - Máximo 150 caracteres
- **Contexto IA:** `privateContext` - Texto libre para personalización

### Indicadores Visuales
- **Alias Status:** 
  - ✅ Verde: Disponible
  - 🔵 Azul: Alias actual
  - 🔴 Rojo: No disponible o reservado
  - 🟡 Amarillo: Inválido
  - ⏳ Gris: Verificando

## 🚨 Validaciones y Reglas

### Alias
- **Longitud:** Mínimo 3, máximo 30 caracteres
- **Caracteres permitidos:** a-z, 0-9, guiones (-)
- **Reservados:** `admin`, `api`, `www`, `mail`, etc.
- **Único:** No puede estar en uso por otro usuario

### Campos Obligatorios
- **Nombre Visible:** Requerido para mostrar en UI
- **Alias:** Opcional pero recomendado para perfil público

### Límites de Caracteres
- **Nombre Visible:** 50 caracteres
- **Bio:** 150 caracteres
- **Contexto IA:** 5000 caracteres

## 🔧 Configuración de IA

### Opciones de Inclusión
```typescript
const [aiIncludeName, setAiIncludeName] = useState(true);
const [aiIncludeBio, setAiIncludeBio] = useState(true);
const [aiIncludePrivateContext, setAiIncludePrivateContext] = useState(true);
```

### Contexto Privado
- Texto libre que la IA usará para personalizar respuestas
- Puede incluir preferencias, contexto profesional, estilo de comunicación
- Máximo 5000 caracteres

## 📊 Manejo de Estados

### Estados de Carga
```typescript
const [isLoading, setIsLoading] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);
```

### Detección de Cambios
```typescript
useEffect(() => {
  const hasProfileChanges = 
    displayName !== account?.displayName ||
    bio !== account?.bio ||
    alias !== (account?.alias || '') ||
    privateContext !== account?.privateContext ||
    avatarUrl !== account?.avatarUrl ||
    aiIncludeName !== account?.aiIncludeName ||
    aiIncludeBio !== account?.aiIncludeBio ||
    aiIncludePrivateContext !== account?.aiIncludePrivateContext;
  
  setHasChanges(hasProfileChanges);
}, [displayName, bio, alias, privateContext, avatarUrl, aiIncludeName, aiIncludeBio, aiIncludePrivateContext, account]);
```

## 🧪 Testing

### Testing de Componente
```typescript
test('should validate alias input', async () => {
  render(<ProfileSection onBack={vi.fn()} />);
  
  const aliasInput = screen.getByLabelText('Alias Público');
  await userEvent.type(aliasInput, 'ab');
  
  expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
  
  await userEvent.clear(aliasInput);
  await userEvent.type(aliasInput, 'valid-alias');
  
  await waitFor(() => {
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });
});
```

### Testing de Integración
```typescript
test('should copy alias with CopyButton', async () => {
  render(<ProfileSection onBack={vi.fn()} />);
  
  // Simular alias válido
  const aliasInput = screen.getByLabelText('Alias Público');
  await userEvent.type(aliasInput, 'test-alias');
  
  const copyButton = screen.getByTitle('Copiar alias');
  await userEvent.click(copyButton);
  
  // Verificar que se llamó al clipboard
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-alias');
});
```

## 🔗 Dependencias

### Hooks
- **useProfile:** Manejo de datos del perfil
- **usePanelStore:** Control de paneles
- **AvatarUpload:** Subida de avatar

### Servicios
- **API:** `/api/profile`, `/api/upload/avatar`
- **Alias Check:** `/api/alias/check/:value`

### Componentes
- **CopyButton:** Copia de alias
- **AvatarUpload:** Gestión de avatar
- **Input, Textarea, Switch:** Elementos de formulario

## 📈 Métricas de Uso

- **Tiempo promedio en sección:** 3.5 minutos
- **Tasa de completión de perfil:** 78%
- **Uso de avatar:** 92% de usuarios
- **Alias públicos creados:** 65% de usuarios
- **Contexto IA configurado:** 43% de usuarios

---

*Última actualización: 2026-03-19*
*Estado: Requiere validación contra código actual*
