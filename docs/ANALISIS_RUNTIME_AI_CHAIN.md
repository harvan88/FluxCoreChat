# Análisis Arquitectónico: Cadena de Resolución Runtime IA

**Fecha:** 2026-02-08  
**Estado:** Diagnóstico completo, pendiente decisión de implementación

---

## 1. Resumen Ejecutivo

El sistema tiene **un problema de arquitectura** en la cadena que va desde que llega un mensaje hasta que la IA responde. Hay **doble lógica duplicada**, **degradación silenciosa de provider**, y **ausencia total de feedback al usuario** cuando la IA no puede responder.

El resultado visible: el usuario configura OpenAI/gpt-4o en el asistente, envía un mensaje, y la IA no responde. Sin ningún mensaje de error. Silencio total.

---

## 2. Cadena Actual (Estado Refactorizado)

```
Mensaje llega
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ MessageDispatchService.handleMessageReceived()          │
│   - Escucha evento core:message_received                │
│   - Resuelve PolicyContext (antes de cualquier runtime) │
│   - Invoca ExtensionHost.processMessage() (Intercept)   │
│   - Delega a RuntimeGateway                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ RuntimeGateway.handleMessage()                          │
│   - Selecciona Adapter (FluxCore / Agent / etc.)        │
│   - Ejecuta Adapter.handleMessage()                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ FluxCoreRuntimeAdapter                                  │
│   - Gestiona Smart Delay (si aplica)                    │
│   - Llama a aiService.generateResponse()                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ aiService.generateResponse()  ← PUNTO CENTRAL           │
│                                                         │
│  1. resolveExecutionPlan(accountId, conversationId)     │
│     → Single Source of Truth                            │
│     → Valida: Asistente, Provider, Creditos, Scopes     │
│                                                         │
│  2. Ejecución (Local vs OpenAI)                         │
│     → Si Local: Llama a extensión @fluxcore/asistentes  │
│     → Si OpenAI: Llama a extensión @fluxcore/openai     │
│                                                         │
│  3. Post-Proceso                                        │
│     → Branding, Traces, Persistencia                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Problemas Identificados (Histórico)

### 3.1 Doble Lógica Duplicada (RESUELTO)

Existen **dos métodos** que hacen esencialmente lo mismo:

| Método | Ubicación | Llamado por | ¿Tiene fix provider? |
|--------|-----------|-------------|---------------------|
| `processMessage()` | ai.service.ts:232 | Ruta directa (NO SE USA en producción) | ✅ Sí |
| `generateResponse()` | ai.service.ts:1268 | MessageDispatch → RuntimeGateway | ✅ Parcheado |

`processMessage()` tiene ~150 líneas de lógica de provider/config que se duplican en `generateResponse()` con ~200 líneas. Ambos:
- Llaman `getAccountConfig()`
- Llaman `resolveActiveAssistant()` 
- Llaman `applyCreditsGating()`
- Construyen `providerOrder`
- Llaman `extension.onConfigChange()`
- Bifurcan entre OpenAI Assistants API y local runtime

**Riesgo:** Cualquier fix en uno se olvida en el otro (como pasó).

### 3.2 `applyCreditsGating()` — Degradación Silenciosa (RESUELTO via ExecutionPlan)

```typescript
// ai.service.ts:545-609
private async applyCreditsGating(params) {
    // Si OpenAI está en providerOrder pero NO hay sesión activa:
    if (!openAIIsPrimary) {
        // ELIMINA openai silenciosamente
        return { config: { ...config, providerOrder: filtered, provider: nextProvider } };
    }
    // Si OpenAI ES primary, intenta abrir sesión:
    try {
        await creditsService.openConversationSession(...);
    } catch (error) {
        // FALLA → ELIMINA openai silenciosamente
        return { config: { ...config, providerOrder: filtered } };
    }
}
```

**Problemas:**
1. **No retorna el motivo** de la degradación (sin créditos, error de DB, etc.)
2. **No emite evento** al frontend
3. **No registra** en ningún log auditable
4. El catch-all en línea 594 trata TODOS los errores igual (sin créditos vs error de DB vs timeout)

### 3.3 `getAccountConfig()` llama `resolveActiveAssistant()` internamente

`getAccountConfig()` (línea 687) ya llama `resolveActiveAssistant()` para leer el provider del asistente. Luego `generateResponse()` lo llama **otra vez** (línea 1291). Son 2 queries a DB por cada mensaje.

### 3.4 FluxCore Extension tiene su propia validación de provider

La extensión en `extensions/fluxcore/src/index.ts:546` hace su PROPIA validación:

```typescript
if (preferredProvider && !hasPreferredProvider) {
    throw new Error(`El asistente requiere ${preferredProvider}, pero no hay credenciales...`);
}
```

Esto es una **tercera capa** de validación que no tiene visibilidad del sistema de créditos.

### 3.5 Sin feedback al usuario

Cuando la IA no responde, el sistema anteriormente simplemente logeaba:
```
[AIOrchestrator] ⚠️ AI generated empty content.
```
Y no pasa nada. El usuario ve silencio en el chat.

---

## 4. Flujo Propuesto (IMPLEMENTADO)

### Principio: "Validar antes, fallar con feedback"

```
Mensaje llega
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ MessageDispatchService.handleMessageReceived()          │
│   - Valida: automation === 'automatic', tiene texto     │
│   - Delega a RuntimeGateway                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ PASO 1: PRE-VALIDACIÓN (nuevo)                          │
│                                                         │
│  resolveExecutionPlan(accountId, conversationId)        │
│    → Resolver asistente activo                          │
│    → Determinar provider requerido                      │
│    → ¿Tiene API key para ese provider? → SÍ/NO         │
│    → ¿Tiene créditos (si es OpenAI)? → SÍ/NO           │
│    → ¿Está habilitada la IA? → SÍ/NO                   │
│                                                         │
│  Retorna: { canExecute, reason?, provider, model, ... } │
└─────────────────────┬───────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
         canExecute      !canExecute
              │               │
              ▼               ▼
┌──────────────────┐  ┌────────────────────────────────┐
│ PASO 2: EJECUTAR │  │ PASO 2b: NOTIFICAR             │
│                  │  │                                │
│ Llamar a la IA   │  │ Emitir WebSocket:              │
│ con el plan      │  │   ai:execution_blocked         │
│ ya validado      │  │   { reason, conversationId }   │
│                  │  │                                │
│ Sin re-validar   │  │ Insertar mensaje sistema:      │
│ Sin re-resolver  │  │   "⚠️ No se respondió:         │
│ Sin gating       │  │    sin créditos para OpenAI"   │
│                  │  │                                │
│ Un solo flujo    │  │ Log auditable para billing     │
└──────────────────┘  └────────────────────────────────┘
```

---

## 5. Opciones de Implementación

### Opción A: Refactor Completo (Recomendado) - SELECCIONADA Y EJECUTADA

**Alcance:** Unificar `processMessage()` y `generateResponse()` en un solo flujo con pre-validación.

**Cambios:**

| Archivo | Cambio |
|---------|--------|
| `ai.service.ts` | Nuevo método `resolveExecutionPlan()` que retorna `{ canExecute, reason, provider, model, providerOrder, sessionId }` |
| `ai.service.ts` | `generateResponse()` usa el plan pre-validado, elimina lógica duplicada |
| `ai.service.ts` | `processMessage()` se marca como deprecated o se elimina |
| `ai.service.ts` | `applyCreditsGating()` retorna `{ allowed, reason }` en vez de degradar silenciosamente |
| `message-dispatch.service.ts` | Reemplaza a AIOrchestrator. Si `!canExecute`, emite evento WebSocket |
| `extensions/fluxcore/src/index.ts` | Eliminar validación redundante de provider (ya se validó arriba) |
| Frontend (MessageBubble o similar) | Renderizar mensajes de tipo `system:ai_blocked` con el motivo |

**Estimación:** ~4-6 horas de trabajo  
**Riesgo:** Medio — toca el flujo principal de IA  
**Beneficio:** Elimina toda la deuda técnica, sistema vendible y auditable

### Opción B: Pre-validar y Notificar (Mínimo viable)

**Alcance:** Agregar pre-validación en AIOrchestrator sin refactorear los dos flujos.

**Cambios:**

| Archivo | Cambio |
|---------|--------|
| `ai.service.ts` | Nuevo método `checkExecutionEligibility(accountId, conversationId)` → `{ eligible, reason }` |
| `ai-orchestrator.service.ts` | Antes de `generateAIResponse()`, llamar `checkExecutionEligibility()`. Si no eligible, emitir WS + insertar mensaje |
| Frontend | Renderizar mensajes sistema con motivo |

**Estimación:** ~2-3 horas  
**Riesgo:** Bajo — no toca el flujo existente, solo agrega un gate  
**Beneficio:** Resuelve el feedback al usuario, pero mantiene la deuda técnica

### Opción C: Solo fix puntual (Ya aplicado)

**Alcance:** El parche actual que re-inyecta el provider después del gating.

**Estado:** Ya implementado  
**Riesgo:** Alto — anula el sistema de créditos, no da feedback  
**Beneficio:** La IA responde con OpenAI, pero sin control de costos

---

## 6. Diagrama de Dependencias Actual (Post-Refactor)

```
MessageDispatchService
    └── RuntimeGateway
            └── FluxCoreRuntimeAdapter
                    └── aiService.generateResponse()
                            ├── resolveExecutionPlan() (Single Source of Truth)
                            │       ├── aiEntitlementsService.getEntitlement()
                            │       ├── fluxcoreService.resolveActiveAssistant()
                            │       ├── creditsService.getActiveConversationSession()
                            │       └── creditsService.openConversationSession()
                            │
                            └── Bifurcación (Plan):
                                ├── runtime=openai → @fluxcore/asistentes-openai
                                └── runtime=local  → @fluxcore/asistentes (FluxCoreExtension)
```

**Observaciones:**
- `resolveActiveAssistant()` se llama **1 sola vez** por mensaje.
- La validación de provider ocurre en **1 solo lugar** (`resolveExecutionPlan`).
- `applyCreditsGating` está integrado en el plan y devuelve razones de bloqueo explícitas.

---

## 7. Recomendación

**Opción B (Pre-validar y Notificar)** como paso inmediato, seguido de **Opción A** como hito de refactor.

**Razón:** La Opción B resuelve el problema visible (silencio en el chat) con riesgo mínimo, y prepara el terreno para el refactor completo. La Opción A es la solución definitiva pero requiere más tiempo y testing.

**Prioridad inmediata:**
1. Implementar `checkExecutionEligibility()` 
2. En AIOrchestrator, si no eligible → emitir `ai:execution_blocked` por WebSocket
3. En el frontend, mostrar un MessageBubble de tipo sistema con el motivo
4. Revertir el parche de re-inyección de provider (para que el gating funcione correctamente)

---

## 8. Sobre el Sistema de Créditos

El sistema de créditos actual funciona así:

```
¿Quiere usar OpenAI?
    │
    ├── ¿Tiene sesión activa (no expirada, con tokens disponibles)?
    │       → SÍ: usar OpenAI, consumir tokens al final
    │       → NO: ¿Puede abrir nueva sesión?
    │               → ¿Tiene balance >= costCredits (default: 1)?
    │                       → SÍ: abrir sesión, descontar crédito
    │                       → NO: "Insufficient credits" → degradar a groq
    │
    └── Groq es gratuito, no requiere créditos
```

**Para que sea vendible:**
- Cuando falla por créditos → mostrar: "⚠️ Tu asistente usa OpenAI. Necesitás créditos para continuar. [Comprar créditos]"
- Cuando falla por API key → mostrar: "⚠️ No hay API key configurada para OpenAI. Contactá al administrador."
- Cuando funciona con Groq → no mostrar nada (es gratuito)

---

## 9. Archivos Clave

| Archivo | Responsabilidad | Líneas clave |
|---------|----------------|--------------|
| `apps/api/src/services/message-dispatch.service.ts` | Escucha mensajes, resuelve contexto, delega al gateway | 1-136 |
| `apps/api/src/services/runtime-gateway.service.ts` | Registro de runtimes y ruteo | 1-275 |
| `apps/api/src/services/ai.service.ts` | Lógica central de IA, generación de respuesta | 1-1124 |
| `apps/api/src/services/ai-execution-plan.service.ts` | Resolución de plan de ejecución (Single Source of Truth) | 1-280 |
| `apps/api/src/services/credits.service.ts` | Wallets, sesiones, policies | 231-402 |
| `extensions/fluxcore/src/index.ts` | Extension runtime, generateSuggestion | 436-848 |

---

## 10. Implementación 2026-02-08 — AI Status + Eligibility

**Objetivo:** materializar la “pre-validación con feedback” sin duplicar lógica.

### Backend
1. **Endpoint `/ai/status`** (apps/api/src/routes/ai.routes.ts): expone `aiService.getStatusForAccount(accountId)` para cuentas válidas. Devuelve `entitled`, `enabled`, `configured`, `connected`, `allowedProviders`, y el historial de intentos (`attempts[]`).
2. **Endpoint `/ai/eligibility`**: llama `resolveExecutionPlan(accountId, conversationId)` y envía al cliente el resultado exacto: `{ canExecute: true, provider, model, runtime, requiresCredits }` o `{ canExecute: false, block }` con `reason/message/creditBalance`.
3. **AiExecutionPlan** sigue siendo la única fuente de verdad (toda la evaluación sigue del lado servidor). El frontend sólo consume la decisión.

### Frontend
1. **Servicio API** (`apps/web/src/services/api.ts`): nuevos métodos `getAIStatus(accountId)` y `getAIEligibility({ accountId, conversationId })`.
2. **Hook `useAIStatus`** (`apps/web/src/hooks/fluxcore/useAIStatus.ts` + barrel export):
   - Hace fetch de `/ai/status` y, cuando hay `conversationId`, también de `/ai/eligibility`.
   - Expone `{ status, eligibility, isLoading, error, refresh }` para cualquier componente FluxCore.
3. **FluxCoreComposer**:
   - Evita abrir el selector de IA o forzar modo automático si `useAIStatus` reporta bloqueo.
   - Muestra un banner contextual (falta de créditos, IA deshabilitada, API key, etc.) con CTA directo: “Gestionar asistentes” abre la vista FluxCore → Asistentes y “Reintentar validación” vuelve a consultar el backend.
   - El botón de AI Mode queda deshabilitado mientras haya bloqueo y se instruye al usuario sobre el motivo real (sin inferencias).

### Beneficios
- Feedback consistente en todos los clientes usando la misma decisión del backend.
- Sin degradaciones silenciosas: cada vez que `resolveExecutionPlan` bloquea, la UI lo refleja y ofrece la acción correcta (gestionar asistentes/credenciales/créditos).
- Base lista para automatizar más checks (ej. nuevos providers) sin tocar el frontend — basta con actualizar `resolveExecutionPlan`.
