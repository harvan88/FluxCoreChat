# Roadmap: Avatares Públicos Persistentes
## Implementación de URLs Públicas para Avatares (Estilo WhatsApp/Telegram)

**Objetivo:** Convertir el sistema actual de avatares con URLs temporales (24h TTL) a URLs públicas persistentes para que las imágenes de perfil estén siempre disponibles en conversaciones históricas.

**Fecha:** 2026-03-19  
**Estatus:** Planificado  
**Prioridad:** Alta (Impacto directo en UX)

---

## 🎯 Visión General

### Problema Actual
- URLs de avatares expiran en 24 horas
- Conversaciones históricas muestran avatares rotos
- Experiencia similar a apps de mensajería moderna

### Solución Propuesta
- URLs públicas permanentes para avatares
- Cache CDN-friendly
- Sin breaking changes en API existente

---

## 📋 Inventario de Cambios Requeridos

### Backend Changes

#### 1. Asset Policy Service
**Archivo:** `apps/api/src/services/asset-policy.service.ts`
- **Línea 41-44:** Agregar nueva política `public_profile_avatar`
- **TTL:** 31536000 segundos (1 año)
- **Contextos:** `['preview:web', 'download:web', 'public:profile']`

#### 2. Storage Adapter
**Archivo:** `apps/api/src/services/storage/local-storage.adapter.ts`
- **Método nuevo:** `getPublicUrl(key: string): Promise<string>`
- **Ruta base:** `/avatars/` en lugar de `/assets/`

#### 3. Server Routes
**Archivo:** `apps/api/src/server.ts`
- **Línea 346-350:** Agregar endpoint público `/avatars/`
- **Antes de:** Serve uploaded files statically
- **Lógica:** Servir sin verificación de firma

#### 4. Avatar Presenter
**Archivo:** `apps/api/src/utils/account-avatar.presenter.ts`
- **Método:** `presentAccountWithAvatar()`
- **Cambio:** Usar `getPublicUrl()` para avatares
- **Fallback:** Mantener lógica actual si no hay avatarAssetId

#### 5. Account Avatar Routes
**Archivo:** `apps/api/src/routes/account-avatar.routes.ts`
- **POST /:accountId/avatar/upload/:sessionId/commit**
- **Cambios:** Guardar en ruta pública `/avatars/`

#### 6. Migration Script
**Archivo:** `packages/db/src/migrations/public_avatar_migration.sql`
- **Mover:** Assets existentes de `/assets/` a `/avatars/`
- **Actualizar:** Storage keys en DB

### Frontend Changes

#### 1. Avatar Component
**Archivo:** `apps/web/src/components/ui/Avatar.tsx`
- **Props:** `src?: string` (sin cambios)
- **Lógica:** Manejar URLs públicas (sin cambios necesarios)
- **Error handling:** Mantener fallback a iniciales

#### 2. Chat Components
**Archivo:** `apps/web/src/components/chat/ChatView.tsx`
- **Uso:** `contactAvatar` de conversación
- **Sin cambios:** Componente Avatar ya maneja errores

#### 3. Conversation Lists
**Archivo:** `apps/web/src/components/conversations/ConversationsList.tsx`
- **Uso:** `contactAvatar` de API
- **Sin cambios:** Flujo existente funciona

#### 4. Contact Lists
**Archivo:** `apps/web/src/components/contacts/ContactsList.tsx`
- **Uso:** `contactAvatar` de API
- **Sin cambios:** Flujo existente funciona

#### 5. Profile Components
**Archivo:** `apps/web/src/components/profile/AvatarUpload.tsx`
- **Upload:** Sin cambios
- **Preview:** Usar URLs públicas

---

## 🔧 Plan de Implementación Detallado

### Fase 1: Backend Core (Estimado: 2-3 horas)

#### Paso 1.1: Nueva Política de Avatar Público
```typescript
// apps/api/src/services/asset-policy.service.ts
const DEFAULT_POLICIES: Record<string, { ttlSeconds: number; contexts: string[] }> = {
  // ... políticas existentes
  public_profile_avatar: {
    ttlSeconds: 31536000, // 1 año
    contexts: ['preview:web', 'download:web', 'public:profile'],
  },
};
```

#### Paso 1.2: Storage Adapter - URL Pública
```typescript
// apps/api/src/services/storage/local-storage.adapter.ts
async getPublicUrl(key: string): Promise<string> {
  return `${this.baseUrl.replace('/assets', '/avatars')}/${key}`;
}
```

#### Paso 1.3: Server Route Público
```typescript
// apps/api/src/server.ts - antes de routes existentes
if (url.pathname.startsWith('/avatars/')) {
  const relativePath = url.pathname.replace(/^\/+avatars\/+/, '');
  if (relativePath.includes('..')) {
    return new Response('Invalid path', { status: 400 });
  }
  
  const fullPath = join(process.cwd(), 'uploads', 'avatars', relativePath);
  try {
    const file = Bun.file(fullPath);
    return new Response(file);
  } catch {
    return new Response('Avatar not found', { status: 404 });
  }
}
```

#### Paso 1.4: Avatar Presenter Update
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
    // NUEVO: Usar URL pública para avatares
    const storage = getStorageAdapter();
    const publicUrl = await storage.getPublicUrl(
      generateStorageKey(account.id, account.avatarAssetId)
    );

    return {
      ...account,
      profile: {
        ...normalizeProfile(account.profile),
        avatarUrl: publicUrl,
      },
    };
  } catch (error) {
    console.error('[AvatarPresenter] Failed to generate public avatar URL', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      error,
    });

    return {
      ...account,
      profile: normalizeProfile(account.profile),
    };
  }
}
```

### Fase 2: Migration de Datos (Estimado: 1 hora)

#### Paso 2.1: Migration Script
```sql
-- packages/db/src/migrations/public_avatar_migration.sql
-- Mover avatares existentes a ruta pública
UPDATE assets 
SET storage_key = REPLACE(storage_key, 'assets/', 'avatars/')
WHERE scope = 'profile_avatar' 
AND storage_key LIKE 'assets/%';

-- Crear directorio si no existe (manual)
-- mkdir -p uploads/avatars
```

#### Paso 2.2: Asset Registry Update
```typescript
// apps/api/src/routes/account-avatar.routes.ts
// En upload commit, usar ruta pública
const storageKey = `avatars/${accountId}/${asset.id}/1`;
```

### Fase 3: Testing y Validación (Estimado: 1 hora)

#### Paso 3.1: Tests Unitarios
```typescript
// apps/api/src/__tests__/avatar-public.test.ts
describe('Avatar Public URLs', () => {
  test('should generate public URL for avatar', async () => {
    const account = { id: 'test-acc', avatarAssetId: 'asset-123' };
    const result = await presentAccountWithAvatar(account, mockContext);
    expect(result.profile.avatarUrl).toContain('/avatars/');
  });

  test('should serve public avatar without auth', async () => {
    const response = await fetch('/avatars/test-acc/asset-123/1');
    expect(response.status).toBe(200);
  });
});
```

#### Paso 3.2: Tests Integración
- Verificar conversaciones históricas muestran avatares
- Verificar upload nuevos usa ruta pública
- Verificar fallback a iniciales si avatar no encontrado

---

## ⚠️ Advertencias y Consideraciones Críticas

### NO Fallos Silenciosos
1. **Error Handling Explícito:** Todos los métodos deben lanzar errores específicos
2. **Logging Detallado:** Cada paso debe tener logs con contexto
3. **Fallback Definido:** Si avatar público falla, usar sistema temporal existente

### Tipado Estricto
1. **Types Definidos:** Crear interfaces específicas para URLs públicas
2. **Return Types:** Todos los métodos deben tener tipos de retorno explícitos
3. **Error Types:** Definir tipos de error específicos para avatar operations

### Seguridad
1. **Path Validation:** Validar que no haya `..` en rutas públicas
2. **File Type Validation:** Solo servir MIME types permitidos
3. **Size Limits:** Mantener límites de tamaño existentes

### Performance
1. **Cache Headers:** Agregar headers de caché agresivos
2. **ETag Support:** Implementar ETags para cache eficiente
3. **CDN Ready:** URLs deben ser CDN-friendly

---

## 📊 Impacto y Métricas

### Métricas de Éxito
- **100%** de avatares visibles en conversaciones históricas
- **<100ms** tiempo de carga de avatares (cache hit)
- **0** errores de avatar expirado

### Impacto en UX
- ✅ Avatares siempre visibles
- ✅ Conversaciones históricas completas
- ✅ Comportamiento similar a WhatsApp/Telegram

### Impacto Técnico
- ✅ Simplificación de código (no TTL renewal)
- ✅ Mejora performance (sin verificación de firma)
- ✅ CDN-ready architecture

---

## 🚀 Deployment Strategy

### Pre-deployment
1. **Backup:** Backup de assets existentes
2. **Testing:** Ejecutar suite completo de tests
3. **Staging:** Deploy en staging primero

### Deployment
1. **Migration:** Ejecutar migration SQL
2. **Backend:** Deploy cambios de API
3. **Frontend:** Deploy cambios (si los hay)
4. **Verification:** Verificar avatares en conversaciones antiguas

### Post-deployment
1. **Monitoring:** Verificar logs de errores
2. **Performance:** Medir tiempos de carga
3. **Rollback Plan:** Tener plan de rollback listo

---

## 📝 Checklist Final

- [ ] Nueva política `public_profile_avatar` creada
- [ ] Storage adapter con `getPublicUrl()` implementado
- [ ] Server route `/avatars/` configurado
- [ ] Avatar presenter actualizado
- [ ] Migration SQL ejecutada
- [ ] Tests unitarios creados y pasando
- [ ] Tests de integración creados y pasando
- [ ] Deploy en staging verificado
- [ ] Backup de assets realizado
- [ ] Deploy en producción completado
- [ ] Monitoreo post-deployment activo
- [ ] Documentación actualizada

---

## 🔗 Referencias

- **Documentación actual:** `asset-policy.service.ts`, `account-avatar.presenter.ts`
- **Storage adapters:** `local-storage.adapter.ts`, `s3-storage.adapter.ts`
- **UI Components:** `Avatar.tsx`, `ChatView.tsx`
- **Best practices:** WhatsApp/Telegram avatar architecture

---

**Owner:** Backend Team  
**Reviewers:** Frontend Team, DevOps  
**Timeline:** 1 día (6-8 horas total)  
**Risk:** Bajo (cambios backwards-compatible)
