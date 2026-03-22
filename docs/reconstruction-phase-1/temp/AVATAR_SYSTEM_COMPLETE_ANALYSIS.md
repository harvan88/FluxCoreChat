# ANÁLISIS COMPLETO DEL SISTEMA DE AVATARES
## Investigación Exhaustiva de Backend, Frontend y Base de Datos

---

## 1. ARQUITECTURA DEL SISTEMA DE AVATARES

### 1.1. Flujo Completo de Datos

```
Usuario sube avatar → Asset Gateway → Asset Registry → Account.avatarAssetId → account-avatar.presenter → URL pública → Frontend
```

### 1.2. Componentes Principales

#### **Backend (API)**
- `account-avatar.routes.ts` - Rutas de upload y gestión
- `account-avatar.presenter.ts` - Generación de URLs públicas
- `asset-registry.service.ts` - Gestión de assets en DB
- `account.service.ts` - Actualización de avatarAssetId en cuentas
- `server.ts` - Servir archivos estáticos `/avatars/{checksum16}`

#### **Frontend (Web)**
- `Avatar.tsx` - Componente estándar con manejo robusto de errores
- `AvatarUpload.tsx` - Componente de upload con preview
- `AccountSwitcher.tsx` - Selector de cuentas con <img> directo
- `PublicProfileHeader.tsx` - Perfil público usando Avatar component

#### **Base de Datos**
- `accounts.avatarAssetId` - FK a assets
- `assets` - Registro de archivos con checksumSHA256
- Storage físico: `uploads/assets/avatars/{shard1}/{shard2}/{checksum16}`

---

## 2. CÓDIGO COMPLETO DEL SISTEMA

### 2.1. Backend - Rutas de Avatar

```typescript
// apps/api/src/routes/account-avatar.routes.ts
export const accountAvatarRoutes = new Elysia({ prefix: '/api/accounts' })
  .post(
    '/:accountId/avatar/upload-session',
    async ({ params, kernelContext, body, set }) => {
      const session = await assetGatewayService.createUploadSession({
        accountId: params.accountId,
        uploadedBy: kernelContext.actorId,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        fileName: body?.fileName,
        mimeType: body?.mimeType,
        ttlMinutes: 15,
      });
      return { success: true, data: session };
    }
  )
  .post(
    '/:accountId/avatar/upload/:sessionId/commit',
    async ({ params, kernelContext, set }) => {
      const result = await assetRegistryService.createFromUpload({
        sessionId: params.sessionId,
        accountId: params.accountId,
        scope: 'profile_avatar',
        dedupPolicy: 'intra_account',
        uploadedBy: kernelContext.actorId,
        name: 'profile_avatar',
        metadata: { purpose: 'account_avatar' },
      });

      const updatedAccount = await accountService.updateAccountAvatar(
        params.accountId, 
        result.asset!.id
      );

      return { success: true, data: { asset: result.asset, account: updatedAccount } };
    }
  )
  .patch(
    '/:accountId/avatar',
    async ({ params, body }) => {
      const updatedAccount = await accountService.updateAccountAvatar(
        params.accountId, 
        body.avatarAssetId
      );
      return { success: true, data: updatedAccount };
    }
  );
```

### 2.2. Backend - Presentador de URLs

```typescript
// apps/api/src/utils/account-avatar.presenter.ts
export async function presentAccountWithAvatar(
  account: Account,
  ctx: AvatarPresentationContext
): Promise<PresentedAccount> {
  if (!account.avatarAssetId) {
    return { ...account, profile: normalizeProfile(account.profile) };
  }

  try {
    // Content-Addressable Storage global con checksum
    const asset = await assetRegistryService.getById(account.avatarAssetId);
    
    if (!asset?.checksumSHA256) {
      throw new Error('No checksum available');
    }

    const publicUrl = `/avatars/${asset.checksumSHA256.slice(0, 16)}`;
    
    return {
      ...account,
      profile: {
        ...normalizeProfile(account.profile),
        avatarUrl: publicUrl,
      },
    };
  } catch (publicUrlError) {
    // FALLBACK EXPLÍCITO: Error público documentado
    try {
      const signed = await assetPolicyService.signAsset({
        assetId: account.avatarAssetId,
        actorId: ctx.actorId,
        actorType: ctx.actorType ?? 'user',
        context: {
          action: ctx.action ?? 'preview',
          channel: ctx.channel ?? 'unknown',
        },
      });

      return {
        ...account,
        profile: {
          ...normalizeProfile(account.profile),
          avatarUrl: signed.url,
        },
      };
    } catch (fallbackError) {
      // ERROR FINAL: Ambos métodos fallaron
      return {
        ...account,
        profile: normalizeProfile(account.profile),
      };
    }
  }
}
```

### 2.3. Backend - Asset Registry (Storage Físico)

```typescript
// apps/api/src/services/asset-registry.service.ts
async createFromUpload(params: CreateAssetFromUploadParams): Promise<{ success: boolean; asset?: Asset; error?: string }> {
  // Commit upload
  const commitResult = await assetGatewayService.commitUpload(params.sessionId);
  const { storageKey: tempStorageKey, checksumSHA256, sizeBytes } = commitResult.data;

  // Mover a ubicación final (Content-Addressable Storage global)
  const checksum16 = checksumSHA256.substring(0, 16);
  const shard1 = checksum16.slice(0, 2);
  const shard2 = checksum16.slice(2, 4);
  const finalStorageKey = `assets/avatars/${shard1}/${shard2}/${checksum16}`;
  
  try {
    await storage.move(tempStorageKey, finalStorageKey);
    await db.update(assets)
      .set({ storageKey: finalStorageKey, updatedAt: new Date() })
      .where(eq(assets.id, asset.id));
  } catch (error) {
    console.error('Failed to move asset:', error);
  }

  await this.updateStatus(asset.id, 'ready');
  return { success: true, asset: updatedAsset! };
}
```

### 2.4. Backend - Server (Servir Archivos)

```typescript
// apps/api/src/server.ts - LÍNEAS 377-438
if (url.pathname.startsWith('/avatars/')) {
  const checksum = url.pathname.replace(/^\/avatars\//, '');
  
  if (!new RegExp(`^[a-f0-9]{16}$`).test(checksum)) {
    return new Response('Invalid checksum', { status: 400 });
  }

  const shard1 = checksum.slice(0, 2);
  const shard2 = checksum.slice(2, 4);

  // Buscar con posibles extensiones y rutas
  const possiblePaths = [
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${shard2}/${checksum}`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${shard2}/${checksum}.jpg`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${shard2}/${checksum}.jpeg`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${shard2}/${checksum}.png`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${shard2}/${checksum}.webp`),
    // Rutas legacy (sin shard2)
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${checksum}`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${checksum}.jpg`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${checksum}.jpeg`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${checksum}.png`),
    path.join(process.cwd(), `uploads/assets/avatars/${shard1}/${checksum}.webp`),
  ];

  let foundPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      foundPath = testPath;
      break;
    }
  }

  if (!foundPath) {
    return new Response('Avatar not found', { status: 404 });
  }

  const avatarFile = Bun.file(foundPath);

  return new Response(avatarFile, {
    headers: {
      'Content-Type': avatarFile.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

### 2.5. Frontend - Avatar Component (Estándar)

```typescript
// apps/web/src/components/ui/Avatar.tsx
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, shape = 'circle', bgColor, className, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const showImage = src && !imageError;
    const initials = getInitials(name || alt);
    const autoColor = getColorFromName(name || alt);

    return (
      <div ref={ref} className={clsx('relative inline-flex items-center justify-center flex-shrink-0', 'font-semibold text-inverse overflow-hidden', sizeStyles[size].container, shape === 'circle' ? 'rounded-full' : 'rounded-lg', !showImage && (bgColor || autoColor), className)}>
        {showImage ? (
          <img
            src={src}
            alt={alt || name}
            onError={(e) => {
              console.log('[Avatar] Image error:', { src, error: e.nativeEvent, status: (e.target as HTMLImageElement)?.naturalWidth === 0 ? 'failed' : 'loaded' });
              setImageError(true); // ← NO OCULTA IMAGEN, solo cambia estado
            }}
            onLoad={() => {
              console.log('[Avatar] Image loaded successfully:', src);
            }}
            className="w-full h-full object-cover"
            {...props}
          />
        ) : (
          <span className={sizeStyles[size].text}>{initials}</span>
        )}
        {/* Status Indicator */}
        {status && (
          <span className={clsx('absolute bottom-0 right-0', 'rounded-full border-2 border-base', sizeStyles[size].status, statusStyles[status])} />
        )}
      </div>
    );
  }
);
```

### 2.6. Frontend - AccountSwitcher (Problemático)

```typescript
// apps/web/src/components/accounts/AccountSwitcher.tsx
const getAvatar = (account: Account | null) => {
  if (!account) return <span className="text-inverse font-bold">?</span>;

  const initials = account.displayName?.charAt(0).toUpperCase() || account.alias?.charAt(0).toUpperCase() || '?';

  if (account.profile?.avatarUrl) {
    return (
      <img 
        src={account.profile.avatarUrl} 
        className="w-full h-full rounded-full object-cover"
        alt={`Avatar de ${account.displayName}`}
        onError={(e) => {
          // ← PROBLEMA: Oculta imagen agresivamente
          console.warn(`[AccountSwitcher] Avatar failed to load for ${account.displayName}:`, account.profile.avatarUrl);
          const target = e.target as HTMLImageElement;
          target.style.display = 'none'; // ← OCULTA IMAGEN
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.fallback-initials')) {
            const fallback = document.createElement('span');
            fallback.className = 'text-inverse font-bold fallback-initials';
            fallback.textContent = initials;
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }
  
  return <span className="text-inverse font-bold">{initials}</span>;
};
```

### 2.7. Frontend - PublicProfileHeader (Funciona)

```typescript
// apps/web/src/public-profile/PublicProfileHeader.tsx
export function PublicProfileHeader({ profile, isConnected }: PublicProfileHeaderProps) {
  return (
    <div className="bg-surface border-b border-subtle px-6 py-5">
      <div className="flex items-center gap-4 max-w-2xl mx-auto">
        <Avatar
          src={profile.avatarUrl || undefined}
          name={profile.displayName}
          size="xl"
          status={isConnected ? 'online' : 'offline'}
        />
        {/* ... resto del componente */}
      </div>
    </div>
  );
}
```

### 2.8. Backend - Public Profile Routes (URL Diferente)

```typescript
// apps/api/src/routes/public-profile.routes.ts - LÍNEAS 181-199
if (account.avatarAssetId) {
  try {
    const signed = await assetPolicyService.signAsset({
      assetId: account.avatarAssetId,
      actorId: 'system-public-profile',
      actorType: 'system',
      context: { action: 'preview', channel: 'web' },
    });
    if (signed) {
      avatarUrl = signed.url; // ← URL FIRMADA, DIFERENTE
    }
  } catch {
    // Avatar signing failed — not critical, continue without it
  }
}

if (!avatarUrl && profile.avatarUrl) {
  avatarUrl = profile.avatarUrl as string; // ← FALLBACK
}
```

---

## 3. BASE DE DATOS - ESTRUCTURA Y DATOS REALES

### 3.1. Schema de Accounts

```sql
-- accounts table (relevant columns)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ownerUserId UUID NOT NULL,
  avatarAssetId UUID REFERENCES assets(id), -- ← FK al asset
  profile JSONB DEFAULT '{}',
  -- ... otras columnas
);
```

### 3.2. Schema de Assets

```sql
-- assets table (relevant columns)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountId UUID NOT NULL,
  checksumSHA256 TEXT NOT NULL,
  storageKey TEXT NOT NULL,
  mimeType TEXT,
  status TEXT DEFAULT 'pending',
  scope TEXT DEFAULT 'message_attachment',
  -- ... otras columnas
);
```

### 3.3. Datos Reales - Harold Ordóñez

```sql
-- Account con avatar
SELECT id, display_name, avatar_asset_id, profile 
FROM accounts 
WHERE avatar_asset_id IS NOT NULL 
LIMIT 1;

-- RESULTADO:
-- id: 3e94f74e-e6a0-4794-bd66-16081ee3b02d
-- display_name: Harold Ordóñez
-- avatar_asset_id: 03fe949c-e355-4b97-8cd7-541375702b3c
-- profile: "{}"
```

### 3.4. Storage Físico Real

```
uploads/assets/avatars/c3/c35e0edf6d093991.jpg (230642 bytes)
```

**Checksum esperado:** `c35e0edf6d093991`
**URL pública:** `/avatars/c35e0edf6d093991`

---

## 4. ANÁLISIS COMPARATIVO: ¿POR QUÉ FUNCIONA EN PERFIL PÚBLICO Y NO EN OTROS LUGARES?

### 4.1. Diferencias Críticas Identificadas

#### **A) FUENTES DE URL DIFERENTES**

**Perfil Público:**
```typescript
// public-profile.routes.ts - LÍNEA 183
const signed = await assetPolicyService.signAsset({
  assetId: account.avatarAssetId,
  actorId: 'system-public-profile',
  actorType: 'system',
  context: { action: 'preview', channel: 'web' },
});
avatarUrl = signed.url; // ← URL FIRMAADA (presigned URL)
```

**Otros lugares (AccountSwitcher, etc.):**
```typescript
// account-avatar.presenter.ts - LÍNEA 50
const publicUrl = `/avatars/${asset.checksumSHA256.slice(0, 16)}`;
avatarUrl = publicUrl; // ← URL LOCAL (Content-Addressable)
```

#### **B) COMPONENTES DIFERENTES**

**Perfil Público:**
```typescript
// PublicProfileHeader.tsx - USA Avatar COMPONENT
<Avatar src={profile.avatarUrl} name={profile.displayName} size="xl" />
```

**AccountSwitcher:**
```typescript
// AccountSwitcher.tsx - USA <img> DIRECTO
<img src={account.profile.avatarUrl} onError={() => target.style.display = 'none'} />
```

#### **C) MANEJO DE ERRORES DIFERENTE**

**Avatar Component (Perfil Público):**
```typescript
onError={(e) => {
  console.log('[Avatar] Image error:', { src, error });
  setImageError(true); // ← Cambia estado, NO oculta
}}
```

**AccountSwitcher (<img> directo):**
```typescript
onError={(e) => {
  target.style.display = 'none'; // ← OCULTA AGRESIVAMENTE
  // ... crea fallback manual
}}
```

---

## 5. DIAGNÓSTICO DEL PROBLEMA

### 5.1. Hipótesis Principal

**El problema NO es un bug simple, es una diferencia arquitectónica:**

1. **Perfil público usa URLs firmadas (presigned)** → Siempre válidas, externas
2. **Otros lugares usan URLs locales** → Dependientes de server local, Content-Addressable

### 5.2. Flujo que Falla

```
AccountSwitcher → account-avatar.presenter → /avatars/c35e0edf6d093991 → Server local → 200 OK → Browser decoding → onError → display = 'none'
```

### 5.3. Flujo que Funciona

```
PublicProfile → public-profile.routes → assetPolicy.signAsset → Presigned URL (S3/AWS?) → 200 OK → Browser decoding → onLoad → ✅
```

### 5.4. Posibles Causas del onError en URLs Locales

1. **Content-Type mismatch:** Server devuelve `application/octet-stream` en lugar de `image/jpeg`
2. **CORS issues:** Las URLs locales no tienen headers CORS correctos
3. **File corruption:** El archivo físico está corrupto o incompleto
4. **Network timing:** Race condition entre onLoad y decoding
5. **Browser security:** Algunos browsers bloquean ciertos content-types desde localhost

---

## 6. EVIDENCIAS ENCONTRADAS

### 6.1. Storage Físico Confirmado
- ✅ Archivo existe: `uploads/assets/avatars/c3/c35e0edf6d093991.jpg`
- ✅ Tamaño razonable: 230,642 bytes (~225KB)

### 6.2. Diferencia de URLs Confirmada
- ✅ Perfil público: Usa `assetPolicyService.signAsset()` → URLs firmadas
- ✅ Otros lugares: Usan `account-avatar.presenter` → URLs locales `/avatars/{checksum16}`

### 6.3. Diferencia de Componentes Confirmada
- ✅ Perfil público: Usa `Avatar` component → Manejo robusto
- ✅ AccountSwitcher: Usa `<img>` directo → Manejo agresivo

---

## 7. CONCLUSIONES

### 7.1. El Problema Real

**NO es un bug de AccountSwitcher, es una inconsistencia arquitectónica:**

1. **Dos sistemas de URLs:** Locales vs Firmadas
2. **Dos sistemas de componentes:** Avatar vs <img> directo  
3. **Dos sistemas de manejo de errores:** Robusto vs Agresivo

### 7.2. ¿Por qué funciona el perfil público?

1. **URLs firmadas externas** → Sin problemas de server local
2. **Avatar component** → Manejo de errores robusto
3. **Contexto diferente** → `system-public-profile` vs user context

### 7.3. ¿Por qué falla en otros lugares?

1. **URLs locales `/avatars/{checksum16}`** → Dependientes de server
2. **<img> directo** → Manejo de errores agresivo
3. **Posible Content-Type mismatch** → `application/octet-stream` vs `image/jpeg`

### 7.4. Solución Sistémica Requerida

**Unificar el sistema:**
1. **Unificar URLs:** Usar siempre `account-avatar.presenter` o siempre `assetPolicy.signAsset`
2. **Unificar componentes:** Usar siempre `Avatar` component
3. **Unificar manejo de errores:** Usar siempre manejo robusto

---

## 8. PRÓXIMOS PASOS RECOMENDADOS

1. **Verificar Content-Type:** Revisar qué headers devuelve `/avatars/{checksum16}`
2. **Probar URLs firmadas:** Reemplazar temporalmente URLs locales por firmadas
3. **Unificar componentes:** Reemplazar todos los `<img>` directos por `Avatar` component
4. **Estandarizar URLs:** Decidir si usar siempre locales o siempre firmadas

---

## 9. REFERENCIAS DEL SISTEMA

### 9.1. Archivos Clave
- `apps/api/src/routes/account-avatar.routes.ts`
- `apps/api/src/utils/account-avatar.presenter.ts`
- `apps/api/src/services/asset-registry.service.ts`
- `apps/api/src/server.ts` (líneas 377-438)
- `apps/web/src/components/ui/Avatar.tsx`
- `apps/web/src/components/accounts/AccountSwitcher.tsx`
- `apps/web/src/public-profile/PublicProfileHeader.tsx`
- `apps/api/src/routes/public-profile.routes.ts`

### 9.2. Rutas de Storage
- `uploads/assets/avatars/{shard1}/{shard2}/{checksum16}`
- Ejemplo real: `uploads/assets/avatars/c3/c35e0edf6d093991.jpg`

### 9.3. Endpoints
- `GET /avatars/{checksum16}` - Server local
- `POST /api/accounts/:accountId/avatar/upload-session` - Upload
- `POST /api/accounts/:accountId/avatar/upload/:sessionId/commit` - Commit
- `GET /public/profiles/:alias` - Perfil público (usa URLs firmadas)

---

**DOCUMENTO COMPLETO - SISTEMA DE AVATARES FLUXCORE**
*Generado: 2026-03-22*
*Investigación exhaustiva de backend, frontend y base de datos*
