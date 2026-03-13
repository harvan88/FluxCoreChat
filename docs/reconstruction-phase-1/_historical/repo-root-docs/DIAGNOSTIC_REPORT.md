# 🔴 Informe Diagnóstico: Bugs Críticos del Runtime FluxCore

**Fecha:** 2026-01-14  
**Versión:** 1.0  
**Estado:** Investigación completa, correcciones pendientes

---

## Resumen Ejecutivo

El sistema FluxCore tiene **tres bugs críticos** que impiden que funcione según lo configurado por el usuario:

1. **Provider del Asistente Ignorado** - El usuario configura OpenAI pero se usa Groq
2. **RAG No Encuentra Chunks** - Hay 127 chunks con embeddings pero la búsqueda retorna 0
3. **Delay del Asistente Parcialmente Ignorado** - El responseDelaySeconds se propaga pero el provider no

---

## Bug #1: Provider del Asistente Ignorado

### Síntoma
- Usuario configura asistente con `provider: "openai"`, `model: "gpt-4o-mini"`
- Sistema usa `provider: "groq"`, `model: "llama-3.1-8b-instant"`

### Evidencia del Prompt Inspector
```json
{
  "modelConfig": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  },
  "effective": {
    "provider": "groq",
    "model": "llama-3.1-8b-instant"
  }
}
```

### Causa Raíz Identificada

**Archivo:** `apps/api/src/services/ai.service.ts`  
**Líneas:** 327-340

```typescript
await extension.onConfigChange(recipientAccountId, {
  ...
  provider: gated.config.provider,           // ❌ USA extension_installations
  providerOrder: gated.config.providerOrder, // ❌ USA extension_installations
  ...
});
```

El código pasa `gated.config.provider` que viene de la tabla `extension_installations` (valor: `"groq"`), **NO** el provider del asistente activo (`"openai"`).

### Flujo Actual (Incorrecto)

```
1. getAccountConfig() → { finalProvider: "openai" } 
2. processMessage() → { provider: gated.config.provider } 
3. FluxCore recibe → { provider: "groq" } 
```

### Solución Propuesta

En `ai.service.ts` línea 331, cambiar:
```typescript
// ANTES (incorrecto)
provider: gated.config.provider,
providerOrder: gated.config.providerOrder,

// DESPUÉS (correcto)
provider: assistantProvider || gated.config.provider,
providerOrder: this.buildProviderOrder(assistantProvider, gated.config.providerOrder),
```

---

## Bug #2: RAG No Encuentra Chunks

### Síntoma
- Vector Store tiene 127 chunks con embeddings
- `ragContext.chunksUsed: 0`
- La IA no tiene acceso a la base de conocimiento

### Evidencia de Logs
```
[retrieval] Vector stores accesibles: 1
[retrieval] Generando embedding con config: { provider: "openai", model: "text-embedding-3-small" }
[retrieval] Embedding generado, dimensiones: 1536
[retrieval] Buscando chunks con minScore: 0.7 topK: 5
[retrieval] Chunks encontrados: 0
```

### Causas Posibles

1. **minScore=0.7 muy alto** (cambié a 0.5 pero el paquete `db` no se recompiló)
2. **Query embedding incorrecto** - Se genera embedding del texto "mira la base de conocimiento" que no tiene similitud con chunks de cubiertas
3. **Dimensiones incompatibles** - Los chunks tienen embeddings de 1536 dimensiones pero el query usa config diferente

### Verificación Necesaria

```sql
-- Ver un chunk de ejemplo
SELECT content, array_length(embedding, 1) as dimensions
FROM fluxcore_document_chunks
WHERE vector_store_id = '1364e0a3-5dbe-42af-adef-89bf76e93061'
LIMIT 1;

-- Probar búsqueda manual con minScore bajo
SELECT content, 1 - (embedding <=> '[query_embedding]'::vector) as similarity
FROM fluxcore_document_chunks
WHERE account_id = '0a98c3f4-d881-4e12-b448-1fb2b28bf1b8'
ORDER BY embedding <=> '[query_embedding]'::vector
LIMIT 5;
```

### Solución Propuesta

1. Recompilar paquete `db`: `bun run build` en `packages/db`
2. Reducir minScore a 0.3 (muy bajo) temporalmente para verificar
3. Verificar que el query sea el mensaje del usuario, no todo el historial

---

## Bug #3: Arquitectura Confusa (FluxCore)

### Síntoma
- `extensions/fluxcore/` debe ser el nombre canónico (sin alias legacy)
- Hay confusión en logs: `[fluxcore]` vs `[FluxCore]`
- El nombre `@fluxcore/fluxcore` es redundante

### Solución Propuesta

Renombrar:
1. `extensions/fluxcore/` (ya aplicado)
2. Manifest: `id: "@fluxcore/fluxcore"` → `id: "@fluxcore"`
3. Todas las referencias en código

---

## Árbol de Dependencias del Bug de Provider

```
extension_installations.config = { provider: "groq" }  ← FUENTE DEL PROBLEMA
                    ↓
        gated = await this.gateAIProcessing()
                    ↓
   gated.config.provider = "groq"  ← VALOR INCORRECTO
                    ↓
   extension.onConfigChange({ provider: gated.config.provider })
                    ↓
   FluxCore usa provider = "groq"

==== SEPARADO DE ====

fluxcore_assistants.model_config = { provider: "openai" }  ← VALOR CORRECTO
                    ↓
   getAccountConfig() lee este valor 
                    ↓
   Retorna { finalProvider: "openai" } ✅
                    ↓
   PERO NO SE PASA A onConfigChange() ❌
```

---

## Recomendaciones Inmediatas

### Prioridad Alta

1. **Corregir líneas 331-338 de ai.service.ts** para usar el provider del asistente activo
2. **Recompilar packages/db** para que minScore=0.5 tome efecto
3. **Agregar log explícito** del provider efectivo usado

### Prioridad Media

1. Renombrar `fluxcore` a `fluxcore`
2. Simplificar arquitectura de config (una sola fuente de verdad)

---

## Archivos Críticos a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `apps/api/src/services/ai.service.ts` | 331-338 | Usar provider del asistente |
| `packages/db/src/schema/fluxcore-rag-configurations.ts` | 294 | minScore: 0.5 |
| `apps/api/src/services/rag-config.service.ts` | 126 | minScore: 0.5 |

---

## Conclusión

El sistema tiene **un bug de diseño fundamental**: hay dos fuentes de configuración que compiten:

1. `extension_installations.config` (configuración de la extensión)
2. `fluxcore_assistants.model_config` (configuración del asistente)

El código actual prioriza incorrectamente la configuración de la extensión sobre la del asistente. El usuario configura el asistente pero sus preferencias son ignoradas.

**Fix crítico necesario:** Modificar `processMessage` para usar el provider/modelo del asistente activo, no de extension_installations.
