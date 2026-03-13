# Estado del Sistema FluxCore - 2026-02-20 22:17

## 🎯 Objetivo
Resolver por qué el AI no responde a mensajes

## ✅ Fixes Completados

### 1. Drizzle ORM Silent Errors
**Problema:** `db.execute()` retornaba array directamente, código accedía a `.rows[0]` (siempre undefined)

**Archivos corregidos:**
- `apps/api/src/services/flux-policy-context.service.ts`
  - Líneas 73-81: Policy query
  - Líneas 95-104: Assistant query  
  - Líneas 109-120: Instructions query (con JOIN a instruction_versions)
  - Líneas 280-289: createDefaultPolicy

### 2. SQL Query para Instructions
**Problema:** Columna `content` está en `fluxcore_instruction_versions`, no en `fluxcore_instructions`

**Fix:** Agregado `INNER JOIN fluxcore_instruction_versions` en línea 113

### 3. resolveFluxiContext
**Problema:** Drizzle schema metadata con `typeId` inexistente en `fluxcore_works`

**Fix:** Convertido completamente a raw SQL (líneas 296-331)

### 4. Policy Mode
**Estado:** Configurado a `'auto'` para Harold (3e94f74e-e6a0-4794-bd66-16081ee3b02d)

### 5. Logs Críticos Agregados
**Archivo:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`

- Línea 53: `🎯 DISPATCH START`
- Línea 57: `Step 1: Resolving conversation`
- Línea 69: `Step 2: Resolving PolicyContext + RuntimeConfig`
- Línea 76: `✓ Context resolved`
- Línea 128: `Step 8: Invoking runtime`
- Línea 130: `✓ Runtime returned X actions`
- Línea 135: `Step 9: Executing actions`
- Línea 144: `✓ Actions executed in AUTO mode`

## ❌ Problema Actual

**Los mensajes NO llegan al CognitiveDispatcher**

Evidencia:
- Scripts de prueba fallan con 401 Unauthorized (tokens expiran)
- Cuando funcionan, no aparecen los logs críticos del dispatcher
- El servidor muestra actividad de AI service pero NO de dispatch

## 🔍 Diagnóstico Pendiente

### Verificar flujo completo:

1. **POST /messages** → ¿Llega al endpoint?
2. **MessageDispatch** → ¿Encola en cognition_queue?
3. **Projectors** → ¿Procesan los signals?
4. **CognitionWorker** → ¿Hace polling de la queue?
5. **CognitiveDispatcher** → ¿Se invoca? (NO LLEGA AQUÍ)

### Tablas Kernel Verificadas:

```
✓ fluxcore_account_policies: 34 registros
✓ fluxcore_assistants: 21 registros  
✓ fluxcore_cognition_queue: 59 registros
✓ fluxcore_projector_cursors: 3 registros
✓ messages: 86 registros
✓ conversations: 17 registros
```

### Configuración Activa:

- Policy mode: `auto` ✅
- Assistant: "Asistente por defecto" (runtime: local) ✅
- Model: groq/llama-3.1-8b-instant ✅

## 🚨 Puntos Críticos a Investigar

1. **¿Por qué los mensajes no generan logs de dispatch?**
   - Posible: MessageDispatch no encola
   - Posible: Projectors no procesan
   - Posible: CognitionWorker no polling

2. **¿Qué cambió en Git que rompió el flujo?**
   - Necesario: revisar commits recientes
   - Buscar: cambios en MessageDispatch, Projectors, CognitionWorker

3. **¿Tablas deprecadas?**
   - `fluxcore_journal` NO EXISTE (error en script)
   - `fluxcore_cognition_queue.created_at` NO EXISTE (es `turn_started_at`)

## 📋 Próxima Acción Recomendada

**Agregar logs en MessageDispatch y CognitionWorker** para ver dónde se detiene el flujo:

1. `apps/api/src/services/message-dispatch.service.ts`
2. `apps/api/src/workers/cognition-worker.ts`

**Usar Web UI para pruebas** (evitar problemas de tokens en scripts)
