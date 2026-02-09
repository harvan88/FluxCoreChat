# Análisis Arquitectónico: Cadena de Resolución Runtime IA

**Fecha:** 2026-02-08  
**Estado:** Diagnóstico completo, pendiente decisión de implementación

---

## 1. Resumen Ejecutivo

El sistema tiene **un problema de arquitectura** en la cadena que va desde que llega un mensaje hasta que la IA responde. Hay **doble lógica duplicada**, **degradación silenciosa de provider**, y **ausencia total de feedback al usuario** cuando la IA no puede responder.

El resultado visible: el usuario configura OpenAI/gpt-4o en el asistente, envía un mensaje, y la IA no responde. Sin ningún mensaje de error. Silencio total.

---

## 2. Cadena Actual (Estado Actual)

```
Mensaje llega
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ AIOrchestrator.handleMessageReceived()                  │
│   - Valida: automation === 'automatic', tiene texto     │
│   - Obtiene delay (getAIAutoReplyDelayMs)               │
│   - setTimeout → scheduleAutoReply()                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ extensionHost.generateAIResponse()                      │
│   → aiService.generateResponse()                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ aiService.generateResponse()  ← PUNTO PROBLEMÁTICO      │
│                                                         │
│  1. getAccountConfig(accountId)                         │
│     → Consulta extension_installations + assistant DB   │
│     → Construye providerOrder: [groq, openai]           │
│     → Consulta resolveActiveAssistant (¡DUPLICADO!)     │
│                                                         │
│  2. resolveActiveAssistant(accountId)  ← 2da llamada    │
│     → Lee assistant.modelConfig.provider = "openai"     │
│                                                         │
│  3. applyCreditsGating()  ← SILENT KILLER               │
│     → ¿Hay sesión de créditos activa? NO                │
│     → ¿OpenAI es primary? SÍ                            │
│     → openConversationSession() → FALLA (sin créditos)  │
│     → catch: ELIMINA openai del providerOrder            │
│     → Resultado: providerOrder = [groq] solamente        │
│                                                         │
│  4. Re-inyección (PARCHE actual)                        │
│     → Detecta que openai fue eliminado                  │
│     → Lo re-agrega desde env vars                       │
│     → ⚠️ ANULA el propósito del gating                  │
│                                                         │
│  5. extension.onConfigChange()                          │
│     → Pasa config al FluxCore extension                 │
│                                                         │
│  6. ¿runtime === 'openai' && externalId? → NO           │
│     → Fallback a extension.generateSuggestion()         │
│                                                         │
│  7. FluxCore extension.generateSuggestion()             │
│     → getProviderOrder() → usa this.config.providerOrder│
│     → Verifica preferredProvider vs providerOrder        │
│     → Si no está → ERROR silencioso                     │
│     → Si está → llama createChatCompletionWithFallback  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Problemas Identificados

### 3.1 Doble Lógica Duplicada

Existen **dos métodos** que hacen esencialmente lo mismo:

| Método | Ubicación | Llamado por | ¿Tiene fix provider? |
|--------|-----------|-------------|---------------------|
| `processMessage()` | ai.service.ts:232 | Ruta directa (NO SE USA en producción) | ✅ Sí |
| `generateResponse()` | ai.service.ts:1268 | AIOrchestrator → extensionHost | ✅ Parcheado |

`processMessage()` tiene ~150 líneas de lógica de provider/config que se duplican en `generateResponse()` con ~200 líneas. Ambos:
- Llaman `getAccountConfig()`
- Llaman `resolveActiveAssistant()` 
- Llaman `applyCreditsGating()`
- Construyen `providerOrder`
- Llaman `extension.onConfigChange()`
- Bifurcan entre OpenAI Assistants API y local runtime

**Riesgo:** Cualquier fix en uno se olvida en el otro (como pasó).

### 3.2 `applyCreditsGating()` — Degradación Silenciosa

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

Cuando la IA no responde, el AIOrchestrator simplemente logea:
```
[AIOrchestrator] ⚠️ AI generated empty content.
```
Y no pasa nada. El usuario ve silencio en el chat.

---

## 4. Flujo Propuesto

### Principio: "Validar antes, fallar con feedback"

```
Mensaje llega
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ AIOrchestrator.handleMessageReceived()                  │
│   - Valida: automation === 'automatic', tiene texto     │
│   - setTimeout → scheduleAutoReply()                    │
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

### Opción A: Refactor Completo (Recomendado)

**Alcance:** Unificar `processMessage()` y `generateResponse()` en un solo flujo con pre-validación.

**Cambios:**

| Archivo | Cambio |
|---------|--------|
| `ai.service.ts` | Nuevo método `resolveExecutionPlan()` que retorna `{ canExecute, reason, provider, model, providerOrder, sessionId }` |
| `ai.service.ts` | `generateResponse()` usa el plan pre-validado, elimina lógica duplicada |
| `ai.service.ts` | `processMessage()` se marca como deprecated o se elimina |
| `ai.service.ts` | `applyCreditsGating()` retorna `{ allowed, reason }` en vez de degradar silenciosamente |
| `ai-orchestrator.service.ts` | Si `!canExecute`, emite evento WebSocket + inserta mensaje sistema |
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

## 6. Diagrama de Dependencias Actual

```
AIOrchestrator
    └── extensionHost.generateAIResponse()
            └── aiService.generateResponse()
                    ├── getAccountConfig()
                    │       ├── aiEntitlementsService.getEntitlement()
                    │       ├── db.extensionInstallations (config legacy)
                    │       ├── fluxcoreService.resolveActiveAssistant() ← 1ra llamada
                    │       └── resolveProviderSelection()
                    │               └── getProductKeysForProvider() (env vars)
                    │
                    ├── fluxcoreService.resolveActiveAssistant() ← 2da llamada (DUPLICADA)
                    │
                    ├── applyCreditsGating()
                    │       └── creditsService.getActiveConversationSession()
                    │       └── creditsService.openConversationSession()
                    │               └── creditsService.getEffectivePolicy()
                    │               └── creditsWallets (balance check)
                    │
                    ├── extension.onConfigChange() → FluxCore extension
                    │
                    └── Bifurcación:
                        ├── runtime=openai → runAssistantWithMessages()
                        └── runtime=local  → extension.generateSuggestion()
                                                └── getProviderOrder() ← 3ra validación
                                                └── fetchActiveAssistant() ← 3ra llamada DB
                                                └── createChatCompletionWithFallback()
```

**Observaciones críticas:**
- `resolveActiveAssistant()` se llama **3 veces** por mensaje (getAccountConfig, generateResponse, fetchActiveAssistant en la extensión)
- La validación de provider ocurre en **3 lugares** diferentes con lógica diferente
- `applyCreditsGating` es el único punto que controla costos, pero su resultado se anula con el parche

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
| `apps/api/src/services/ai-orchestrator.service.ts` | Escucha mensajes, programa auto-reply | 79-153 |
| `apps/api/src/services/ai.service.ts` | Lógica central de IA, gating, config | 232-543 (processMessage), 545-609 (gating), 614-754 (getAccountConfig), 1268-1705 (generateResponse) |
| `apps/api/src/services/extension-host.service.ts` | Proxy entre orchestrator y ai.service | 341-348 |
| `apps/api/src/services/credits.service.ts` | Wallets, sesiones, policies | 231-402 |
| `apps/api/src/services/ai-entitlements.service.ts` | Permisos de providers por cuenta | 14-37 |
| `extensions/fluxcore/src/index.ts` | Extension runtime, generateSuggestion | 436-848 (generateSuggestion), 1124-1160 (getProviderOrder) |

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
