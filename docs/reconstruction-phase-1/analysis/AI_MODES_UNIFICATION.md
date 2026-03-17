# Modos de IA: Análisis, Migración y Fix — Registro Consolidado

**Estado:** ✅ Cerrado — Implementado y verificado  
**Período:** 2026-03-17  
**Archivos afectados:**
- `packages/db/src/schema/automation-rules.ts`
- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/routes/fluxcore.routes.ts`
- `apps/web/src/extensions/fluxcore/components/SuggestResponsePanel.tsx`
- `apps/web/src/components/monitor/VisualPipeline.tsx`

---

## Parte 1: Diagnóstico — Doble Arquitectura de Modos

### Contexto
Se identificaron **dos sistemas paralelos** manejando los modos de automatización:

| Sistema | Ubicación | Modos | Por Conversación? | Usado en Frontend? |
|---------|-----------|-------|-------------------|---------------------|
| **Legacy** (Automation Rules) | `automation_rules` table | `automatic`, `supervised`, `disabled` | ✅ Sí (`relationshipId`) | ❌ No |
| **FluxCore** (Assistant Mode) | `fluxcore_assistants` / `account_policies` | `auto`, `suggest`, `off` | ❌ Solo global | ✅ Sí |

### Problemas Detectados
1. **Frontend mentía al usuario**: Los botones individuales por conversación realmente cambiaban el modo global.
2. **Nomenclatura inconsistente**: Legacy usaba `automatic/supervised/disabled`, FluxCore usaba `auto/suggest/off`.
3. **Sin prioridad jerárquica**: FluxCore no soportaba `relationship > account > default`.

---

## Parte 2: Migración Ejecutada — Unificación a `auto|suggest|off`

### Acciones Realizadas

**Base de Datos:**
- Schema `AutomationMode` unificado a `'auto' | 'suggest' | 'off'`
- Valor default cambiado de `'supervised'` a `'suggest'`

**Backend:**
- `AutomationControllerService`: Migrado a nueva nomenclatura + método `getRelationshipMode`
- `FluxPolicyContextService`: Resolución jerárquica implementada (Relationship Rules > Account Policy)
- `ws-handler.ts`: Procesa eventos con `evaluation.mode === 'auto'`
- Validaciones actualizadas en rutas

**Frontend:**
- Hooks `useAutomation.ts` y `useAssistantMode.ts` migrados
- `ConversationRowAIStatus.tsx` creado
- `ConversationsList.tsx` permite cambiar modo por conversación (Relationship)
- `AutomationSection.tsx` actualizado

**Resultado:**
```
DB (auto) ➔ Service (auto) ➔ PolicyContext (auto) ➔ Frontend (auto)
```
Línea recta de igualdad, sin mapeos ni traducciones.

---

## Parte 3: Bug Post-Migración — Modo Suggest Enviaba Automáticamente

### Síntoma
En modo `suggest`, la respuesta de la IA aparecía correctamente en `SuggestResponsePanel`, pero **también se enviaba automáticamente** al destinatario. El humano perdía el control de aprobación.

### Causa Raíz
En `cognitive-dispatcher.service.ts`, `actionExecutor.execute()` se ejecutaba **incondicionalmente** (línea 247), y la verificación de `mode === 'suggest'` ocurría **después** (línea 275). Para cuando el dispatcher verificaba el modo, el mensaje ya había sido:
1. Certificado por `cognitionGateway.certifyAiResponse()`
2. Ingestado por el Kernel como señal `AI_RESPONSE_GENERATED`
3. Proyectado por ChatProjector al destinatario via WebSocket

### Bugs Adicionales Descubiertos
- **Double-close del turno**: `closeTurn()` se llamaba dos veces en modo suggest
- **Aprobación bypasea ChatCore**: `PATCH /suggestions/:id` hacía `db.insert(messages)` directo, sin broadcast WebSocket
- **Dualidad de paths de aprobación**: REST API y WebSocket `approve_suggestion` usaban caminos distintos

### Fix Aplicado

**FIX 1 — Suggest Gate (cognitive-dispatcher.service.ts):**
```typescript
// ANTES de actionExecutor.execute():
if (policyContext.mode === 'suggest') {
    // Guardar sugerencia → cerrar turno → return
    // NUNCA ejecutar actionExecutor.execute()
}
// Solo modo AUTO llega a actionExecutor.execute()
```

**FIX 2 — Aprobación via ChatCore (fluxcore.routes.ts):**
```typescript
// ANTES: db.insert(messages).values({...})  ← directo, sin WS
// AHORA: messageCore.send({...})  ← pipeline completo con broadcast
```

**FIX 3 — Clipboard de trazas (VisualPipeline.tsx):**
- `navigator.clipboard.writeText()` no estaba siendo `await`eado
- Agregado `async/await` + fallback con `document.execCommand('copy')`

### Flujo Corregido por Modo

| Modo | Nodos del Pipeline | Comportamiento |
|------|--------------------|----------------|
| **auto** | 1→2→3→4→5→6→7 | Traza completa. Mensaje enviado automáticamente. |
| **suggest** | 1→2→3→4→5 | Dispatcher guarda sugerencia y retorna. Nodos 6-7 ocurren cuando el humano aprueba. |
| **off** | 1→2→3 (stop) | Dispatcher cierra turno sin invocar Runtime. |

---

## Documentos Fuente (Archivados)
Los análisis originales detallados que formaron este registro están en `_historical/`:
- `AI_MODES_ARCHITECTURE_ANALYSIS.md` — Análisis detallado de la doble arquitectura
- `PROPOSED_AI_MODES_MIGRATION_PLAN.md` — Plan de migración original
- `SUGGEST_MODE_BUG_ANALYSIS.md` — Análisis detallado del bug con revisión de código

---

*Cerrado: 2026-03-17. Verificado con `bun run build` — API compila exitosamente.*
