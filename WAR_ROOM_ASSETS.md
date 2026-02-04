# 🚨 War Room: Asset Management System

**Fecha:** 2026-02-03  
**Estado:** CRÍTICO - Sistema inestable, sin tests, comportamiento no verificado

---

## 📊 Estado Actual

### Tablas de Base de Datos (✅ Existen)
- `assets` - Tabla principal de assets
- `asset_upload_sessions` - Sesiones de upload
- `asset_policies` - Políticas de acceso
- `asset_audit_logs` - Logs de auditoría
- `message_assets` - Relación mensajes-assets
- `template_assets` - Relación templates-assets
- `plan_assets` - Relación plans-assets

### Servicios Implementados (⚠️ Parcialmente)
- `asset-registry.service.ts` - CRUD básico ✅
- `asset-gateway.service.ts` - Sesiones de upload ⚠️
- `asset-policy.service.ts` - Políticas ⚠️
- `asset-audit.service.ts` - Auditoría ✅
- `storage/` - Storage adapters (local) ✅

### Rutas API (⚠️ Problemáticas)
- `POST /api/assets/upload-session` - ✅ Funciona con query param fix
- `PUT /api/assets/upload/:sessionId` - ⚠️ Problema con body binario
- `POST /api/assets/upload/:sessionId/commit` - ⚠️ Problema con accountId
- `GET /api/assets/:assetId` - ❌ No probado
- `POST /api/assets/:assetId/sign` - ❌ No probado
- `DELETE /api/assets/:assetId` - ❌ No probado
- `GET /api/assets/:assetId/versions` - ❌ No probado
- `POST /api/assets/search` - ❌ No probado

---

## 🔴 Problemas Identificados

### 1. Upload Binario (CRÍTICO)
**Problema:** El endpoint PUT no recibe correctamente el body binario.
```
TypeError: The first argument must be of type string, Buffer, ArrayBuffer...
Received: undefined
```
**Causa:** Elysia no configura correctamente el parser de body binario.

### 2. Commit Upload (CRÍTICO)
**Problema:** El endpoint de commit espera `accountId` en body pero frontend lo envía como query.
**Estado:** Parcialmente corregido - ahora acepta query OR body.

### 3. Falta de Tests (CRÍTICO)
**Problema:** No hay tests de integración ni unitarios para el sistema de assets.
**Impacto:** No se puede verificar comportamiento esperado.

### 4. Sin Documentación de Flujo (ALTO)
**Problema:** No hay documentación del flujo completo upload-session → upload → commit.
**Impacto:** Dificulta debugging y mantenimiento.

---

## ✅ Comportamiento Esperado

### Flujo de Upload
```
1. Frontend: POST /api/assets/upload-session
   → Backend: Crea sesión, retorna sessionId
   
2. Frontend: PUT /api/assets/upload/{sessionId}
   Body: archivo binario (ArrayBuffer)
   → Backend: Guarda archivo temporal, actualiza progreso
   
3. Frontend: POST /api/assets/upload/{sessionId}/commit
   → Backend: 
      - Calcula checksum
      - Verifica deduplicación
      - Mueve archivo a ubicación final
      - Crea registro en tabla assets
      - Retorna asset metadata
```

### Estados de Asset
- `pending` - Subido pero no validado
- `ready` - Validado y disponible
- `archived` - Archivado (soft delete)
- `deleted` - Marcado para eliminación

---

## 🔧 Acciones Pendientes

### Prioridad 1 (Inmediata)
- [ ] Corregir endpoint PUT upload para recibir body binario correctamente
- [ ] Verificar endpoint commit funciona con query param
- [ ] Crear test de integración básico: flujo completo de upload

### Prioridad 2 (Esta semana)
- [ ] Crear tests para todos los endpoints de assets
- [ ] Documentar comportamiento de cada endpoint
- [ ] Verificar storage adapter (local) funciona correctamente

### Prioridad 3 (Próximas semanas)
- [ ] Implementar validación de archivos (tamaño, tipo)
- [ ] Implementar deduplicación por checksum
- [ ] Implementar URLs firmadas con expiración
- [ ] Agregar soporte para storage cloud (S3, etc.)

---

## 🧪 Tests Necesarios

### Test 1: Flujo Completo de Upload
```typescript
// Crear sesión
const session = await createSession({ accountId, fileName, sizeBytes });
expect(session.sessionId).toBeDefined();

// Subir archivo
const upload = await uploadFile(session.sessionId, fileBuffer);
expect(upload.success).toBe(true);

// Commit
const asset = await commitUpload(session.sessionId, accountId);
expect(asset.id).toBeDefined();
expect(asset.status).toBe('ready');
```

### Test 2: Deduplicación
```typescript
// Subir archivo
const asset1 = await uploadAndCommit(fileBuffer);

// Subir mismo archivo
const asset2 = await uploadAndCommit(fileBuffer);
expect(asset1.id).toBe(asset2.id); // Mismo asset (dedup)
```

### Test 3: URLs Firmadas
```typescript
const asset = await uploadAndCommit(fileBuffer);
const signedUrl = await signAssetUrl(asset.id, context);
expect(signedUrl.url).toBeDefined();
expect(signedUrl.expiresAt).toBeDefined();
```

---

## 📋 Próximos Pasos

1. **Corregir PUT upload** - Configurar Elysia para recibir ArrayBuffer
2. **Verificar commit** - Probar flujo completo manualmente
3. **Crear tests** - Implementar tests básicos de integración
4. **Documentar** - Crear documentación del comportamiento

**Asignado:** @harvan88  
**Deadline:** 2026-02-10
