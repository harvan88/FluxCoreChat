# Plan de Refactorización: Template Registry Pattern

> **Fecha**: 2026-02-06
> **Estado**: Propuesta Arquitectónica
> **Prioridad**: Alta

---

## 1. Problema Actual

### 1.1 Arquitectura Fragmentada

El sistema de plantillas actualmente tiene **inyección de contexto en múltiples puntos** que divergen según el runtime:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANTILLAS (Source of Truth)                  │
│  templates + fluxcore_template_settings (DB)                     │
└─────────────────────────────────────────────────────────────────┘
              │                               │
              │                               │
              ▼                               ▼
┌─────────────────────────┐      ┌─────────────────────────────────┐
│  OPENAI ASSISTANTS API  │      │         FLUXCORE LOCAL          │
│                         │      │                                 │
│  INYECCIÓN: ESTÁTICA    │      │  INYECCIÓN: DINÁMICA            │
│  (al crear/actualizar   │      │  (en cada request)              │
│   el asistente)         │      │                                 │
│                         │      │                                 │
│  Archivo:               │      │  Archivo:                       │
│  assistants.service.ts  │      │  runtime.service.ts             │
│  líneas 326-341, 478-506│      │  líneas 158-195                 │
└─────────────────────────┘      └─────────────────────────────────┘
```

### 1.2 Puntos de Dolor Identificados

| Problema | Impacto | Archivos Afectados |
|----------|---------|-------------------|
| **Prompt congelado en OpenAI** | Cambios en plantillas no se reflejan hasta re-guardar el asistente | `assistants.service.ts` |
| **Validación dispersa** | 3+ lugares validan `authorizeForAI` | `ai-template.service.ts`, `assistants.service.ts`, `runtime.service.ts` |
| **Lógica duplicada** | `buildTemplatesInstructionBlock` llamada desde 2 lugares distintos | `assistants.service.ts` (×2), `runtime.service.ts` (×1) |
| **Falta de consistencia** | OpenAI y Local pueden tener prompts diferentes | Divergencia arquitectónica |

### 1.3 Flujo de Código Actual

#### OpenAI Runtime (Problemático)
```
1. Usuario crea/edita Asistente
   ↓
2. assistants.service.ts:createAssistant() o updateAssistant()
   ↓
3. buildTemplatesInstructionBlock() genera prompt
   ↓
4. Prompt se envía a OpenAI y queda CONGELADO en el asistente
   ↓
5. Usuario crea/edita plantilla
   ↓
6. ❌ El asistente OpenAI NO conoce la nueva plantilla
```

#### FluxCore Local (Correcto)
```
1. Mensaje entrante
   ↓
2. runtime.service.ts:getAssistantComposition()
   ↓
3. buildTemplatesInstructionBlock() genera prompt FRESCO
   ↓
4. ✅ El prompt siempre incluye las plantillas actuales
```

---

## 2. Solución Propuesta: Template Registry Pattern

### 2.1 Concepto

> **El prompt es efímero.** Las instrucciones de uso de herramientas deben inyectarse **justo antes de la ejecución**, no al configurar el asistente.

OpenAI Assistants API soporta `additional_instructions` en el `run()`, que **se anexa** a las instrucciones base del asistente sin sobrescribirlas.

### 2.2 Nueva Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│               TEMPLATE REGISTRY SERVICE (NUEVO)                  │
│                                                                 │
│  Responsabilidades:                                             │
│  • Single Source of Truth para plantillas autorizadas           │
│  • Genera el bloque de instrucciones bajo demanda               │
│  • Valida autorización de ejecución                             │
│                                                                 │
│  Métodos:                                                       │
│  • getAuthorizedTemplates(accountId): AuthorizedTemplate[]      │
│  • buildInstructionBlock(accountId): string                     │
│  • canExecute(templateId, accountId): boolean                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    (consulta cada request)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RUNTIME UNIFICADO                             │
│                                                                 │
│  Punto único de inyección para AMBOS runtimes                   │
└─────────────────────────────────────────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐      ┌─────────────────────────────────┐
│     OPENAI RUNTIME      │      │        LOCAL RUNTIME            │
│                         │      │                                 │
│  run() con:             │      │  System prompt con:             │
│  additional_instructions│      │  bloque de plantillas anexado   │
│  = Registry.buildBlock()│      │  = Registry.buildBlock()        │
└─────────────────────────┘      └─────────────────────────────────┘
```

---

## 3. Análisis de Impacto en Código

### 3.1 Archivos a Modificar

| Archivo | Cambio | Complejidad |
|---------|--------|-------------|
| `apps/api/src/services/fluxcore/template-registry.service.ts` | **CREAR** - Nuevo servicio centralizado | Media |
| `apps/api/src/services/fluxcore/assistants.service.ts` | **MODIFICAR** - Eliminar inyección de plantillas en create/update | Baja |
| `apps/api/src/services/fluxcore/runtime.service.ts` | **MODIFICAR** - Delegar a Template Registry | Baja |
| `apps/api/src/services/openai-sync.service.ts` | **MODIFICAR** - Usar `additional_instructions` | Media |
| `apps/api/src/services/ai.service.ts` | **MODIFICAR** - Pasar `additionalInstructions` al run | Baja |
| `apps/api/src/services/ai-template.service.ts` | **MODIFICAR** - Delegar validación a Registry | Baja |

### 3.2 Archivos que NO Requieren Cambios

| Archivo | Razón |
|---------|-------|
| `apps/api/src/services/template.service.ts` | Es el servicio Core de plantillas, no conoce IA |
| `apps/api/src/routes/templates.routes.ts` | Solo expone CRUD, lógica de IA está en servicios |
| `packages/db/src/schema/*` | No hay cambios de schema |
| `apps/web/src/components/templates/*` | UI no cambia |

---

## 4. Hitos de Implementación

### Hito 1: Crear Template Registry Service
**Duración estimada**: 30 min  
**Archivo**: `apps/api/src/services/fluxcore/template-registry.service.ts`

**Acciones**:
1. Crear nuevo servicio consolidando lógica de `buildTemplatesInstructionBlock`
2. Mover el método desde `assistants.service.ts`
3. Exponer métodos: `getAuthorizedTemplates`, `buildInstructionBlock`, `canExecute`

**Validación**:
- [ ] El servicio compila sin errores
- [ ] Los métodos retornan datos correctos

---

### Hito 2: Actualizar OpenAI Sync Service
**Duración estimada**: 20 min  
**Archivo**: `apps/api/src/services/openai-sync.service.ts`

**Acciones**:
1. Verificar que `runAssistantWithMessages` ya acepta `additionalInstructions` (línea 635) ✅
2. El servicio ya está preparado, solo necesita recibir el bloque correcto

**Validación**:
- [ ] El parámetro `additional_instructions` se envía correctamente al run

---

### Hito 3: Modificar AI Service para Inyección Dinámica
**Duración estimada**: 30 min  
**Archivo**: `apps/api/src/services/ai.service.ts`

**Acciones**:
1. Importar `TemplateRegistryService`
2. Antes de llamar a `runAssistantWithMessages`, generar el bloque de plantillas
3. Pasar el bloque como `additionalInstructions`

**Código conceptual**:
```typescript
// En ai.service.ts, antes de runAssistantWithMessages:
const templateBlock = await templateRegistry.buildInstructionBlock(recipientAccountId);

const result = await runAssistantWithMessages({
  assistantExternalId,
  messages: threadMessages,
  instructions: systemPrompt.trim() || undefined, // Instrucciones base del asistente
  additionalInstructions: templateBlock, // ← NUEVO: Plantillas inyectadas dinámicamente
  traceId,
  accountId: recipientAccountId,
  conversationId,
});
```

**Validación**:
- [ ] El flujo OpenAI recibe el bloque de plantillas actualizado
- [ ] Cambios en plantillas se reflejan inmediatamente (sin re-guardar asistente)

---

### Hito 4: Eliminar Inyección Estática en Assistants Service
**Duración estimada**: 20 min  
**Archivo**: `apps/api/src/services/fluxcore/assistants.service.ts`

**Acciones**:
1. **createAssistant**: Eliminar líneas 326-341 (inyección de templateBlock)
2. **updateAssistant**: Eliminar líneas 478-506 (inyección de templateBlock)
3. Eliminar la función `buildTemplatesInstructionBlock` (ya movida a Registry)

**Antes**:
```typescript
// En createAssistant:
if (hasTemplates) {
  const templateBlock = await buildTemplatesInstructionBlock(assistantData.accountId);
  if (templateBlock) {
    finalInstructions = `${templateBlock}\n\n${finalInstructions}`;
  }
}
```

**Después**:
```typescript
// Ya no se inyecta aquí. Las plantillas se inyectan en runtime via additional_instructions.
```

**Validación**:
- [ ] Crear un nuevo asistente OpenAI NO incluye bloque de plantillas en `instructions`
- [ ] El asistente funciona correctamente porque recibe plantillas en runtime

---

### Hito 5: Actualizar Runtime Service para Local
**Duración estimada**: 15 min  
**Archivo**: `apps/api/src/services/fluxcore/runtime.service.ts`

**Acciones**:
1. Reemplazar `assistantsService.buildTemplatesInstructionBlock` por `templateRegistry.buildInstructionBlock`
2. La lógica ya es correcta (inyección dinámica), solo cambiar la fuente

**Validación**:
- [ ] El flujo local sigue funcionando igual
- [ ] Ambos flujos usan la misma fuente de verdad

---

### Hito 6: Unificar Validación en AI Template Service
**Duración estimada**: 15 min  
**Archivo**: `apps/api/src/services/ai-template.service.ts`

**Acciones**:
1. Reemplazar validación local por `templateRegistry.canExecute()`
2. Eliminar import redundante de `fluxCoreTemplateSettingsService`

**Antes**:
```typescript
const settings = await fluxCoreTemplateSettingsService.getSettings(templateId);
if (!settings.authorizeForAI || !template.isActive) {
  throw new Error('Template not authorized for AI use');
}
```

**Después**:
```typescript
const canExecute = await templateRegistry.canExecute(templateId, accountId);
if (!canExecute) {
  throw new Error('Template not authorized for AI use');
}
```

**Validación**:
- [ ] La ejecución de plantillas sigue validando correctamente
- [ ] Solo hay UN punto de validación de autorización

---

### Hito 7: Cleanup y Documentación
**Duración estimada**: 20 min

**Acciones**:
1. Eliminar imports no usados
2. Actualizar `PLAN_TEMPLATE_MANAGER.md` con la nueva arquitectura
3. Agregar comentarios de arquitectura en los servicios modificados
4. Ejecutar pruebas manuales en ambos runtimes

**Validación**:
- [ ] `bun run dev` sin errores ni warnings
- [ ] Crear plantilla → IA la usa inmediatamente (OpenAI)
- [ ] Crear plantilla → IA la usa inmediatamente (Local)
- [ ] Eliminar plantilla → IA deja de usarla inmediatamente

---

## 5. Resumen de Movimientos

| # | Acción | Archivo | Riesgo |
|---|--------|---------|--------|
| 1 | CREAR servicio | `template-registry.service.ts` | Bajo |
| 2 | VERIFICAR parámetro | `openai-sync.service.ts` | Nulo |
| 3 | MODIFICAR inyección | `ai.service.ts` | Bajo |
| 4 | ELIMINAR código | `assistants.service.ts` | Medio |
| 5 | ACTUALIZAR import | `runtime.service.ts` | Bajo |
| 6 | SIMPLIFICAR validación | `ai-template.service.ts` | Bajo |
| 7 | CLEANUP | Varios | Nulo |

**Total estimado**: ~2.5 horas

---

## 6. Rollback Plan

Si la migración falla:
1. Revertir commits de Git
2. La funcionalidad anterior sigue funcionando (inyección estática)
3. No hay migración de datos, solo cambios de código

---

## 7. Dependencias

- [ ] Confirmar que `OpenAI SDK` soporta `additional_instructions` (✅ Verificado en código línea 635)
- [ ] Verificar que no hay otros consumidores de `buildTemplatesInstructionBlock`

---

*Documento creado: 2026-02-06*
*Autor: Antigravity AI Assistant*
