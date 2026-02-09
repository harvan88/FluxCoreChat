# AI Response Chain — Architecture & Operations Guide

_Last updated: 2026-02-08_

## 1. High-Level Flow

```mermaid
graph TD
    A[Harold envia mensaje] --> B[MessageCore.receive]
    B --> C[resolveExecutionPlan]
    C -->|Blocked| D[ai:execution_blocked (WS)]
    C -->|Eligible| E[generateResponse]
    E --> F[extensionHost + provider runtime]
    F --> G[Suggestion enviada a conversación]
```

1. **MessageCore** recibe el mensaje y actualiza la conversación / relationship.
2. **AIOrchestrator** programa la evaluación automática y llama a `resolveExecutionPlan(accountId, conversationId)` _una sola vez_.
3. `resolveExecutionPlan` valida asistente activo, proveedor, scopes y créditos. Devuelve un `EligiblePlan` o un `BlockedPlan` con metadatos.
4. `generateResponse` consume el plan: si está bloqueado -> emite `ai:execution_blocked` vía WebSocket (sólo para la cuenta interna). Si está habilitado -> ejecuta la estrategia OpenAI / Local y devuelve la sugerencia.

## 2. Componentes y responsabilidades

| Capa | Archivo | Responsabilidad principal |
| --- | --- | --- |
| **Resolver** | `apps/api/src/services/ai-execution-plan.service.ts` | Única fuente de verdad. Resuelve asistente activo, proveedor, API keys, scopes, créditos (incluye `creditsService`). Devuelve `ExecutionPlan`. |
| **Entitlements / Scopes** | `apps/api/src/services/ai-entitlements.service.ts` | Define qué proveedores (`groq`, `openai`) están habilitados por cuenta y cuál es el provider por defecto. Usado por el resolver antes de elegir modelo. |
| **Créditos** | `apps/api/src/services/credits.service.ts` | Lleva wallets, ledger, políticas y sesiones por conversación. Abre una sesión (`openConversationSession`) que descuenta créditos sólo si hay política activa (ahora siempre cae a `DEFAULT_POLICY` si no existe específica). |
| **AIOrchestrator** | `apps/api/src/services/ai-orchestrator.service.ts` | Orquesta retrasos, llama a `generateAIResponse`, maneja bloqueos y emite eventos WS. |
| **AI Service** | `apps/api/src/services/ai.service.ts` | Ejecuta el plan (OpenAI Assistants API vs runtime local), aplica tools, logging, etc. |
| **Frontend** | `apps/web/src/hooks/useWebSocket.ts` + chat components | Consume `ai:execution_blocked` y muestra toast sólo al owner (cuenta interna). Renderiza mensajes y sugiere acciones. |
| **Eventos FluxCore** | `apps/web/src/hooks/fluxcore/events.ts` + `useAIStatus` | Cada vez que se crea/actualiza/activa un asistente se emite `fluxcore:assistant-update`. Los componentes que usan `useAIStatus` escuchan este evento y refrescan inmediatamente `/ai/status` + `/ai/eligibility`, reflejando los cambios en tiempo real en Composer, Prompt Inspector, etc. |

## 3. Créditos: almacenamiento y consulta

- **Wallet**: tabla `creditsWallets` (`accountId`, `balance`).
- **Ledger**: tabla `creditsLedger` con historiales `grant/spend`.
- **Policies**: tabla `creditsPolicies` (`featureKey`, `engine`, `model`, `costCredits`, `tokenBudget`, `durationHours`, `active`). El servicio siempre cae a `DEFAULT_POLICY` (`ai.session` + `openai_chat`) si no hay policy exacta para el modelo.
- **Sesiones**: tabla `creditsConversationSessions`; se abre cuando `openConversationSession()` descuenta créditos y entrega `tokenBudget` por 24h.

### Flujo durante ejecución

1. `resolveExecutionPlan` llama a `creditsService.getActiveConversationSession`. Si hay una sesión activa con tokens disponibles, reutiliza el `sessionId`.
2. Si no, `openConversationSession` busca política y descuenta `costCredits` del wallet. Si el balance < costo → `Insufficient credits`.
3. El `sessionId` se adjunta al plan para que `creditsService.consumeSessionTokens` pueda registrar tokens reales cuando la IA responde.

### Exponer créditos en UI

- API disponible: `creditsService.getBalance(accountId)` para mostrar saldo.
- Se puede crear un endpoint (ej. `/api/credits/:accountId`) que combine balance + sesiones activas para paneles internos.
- Para transparencia al agente: el evento `ai:execution_blocked` trae `block.creditBalance` cuando aplica.

## 4. Configuración del asistente (Single Source of Truth)

- `fluxcore.service.ts` expone `resolveActiveAssistant(accountId)` → trae composición completa (instrucciones, vector stores, tools, timing, modelConfig).
- La UI (`AssistantsView`) actualiza esa configuración vía API `PUT /fluxcore/assistants/:id`.
- `ai-execution-plan.service` consume esa misma composición; ya no se recalculan providers en múltiples lugares.
- Templates dinámicos se inyectan en runtime a través de `template-registry.service.ts`; no hace falta re-guardar el asistente para reflejar cambios de plantillas.

## 5. Scopes y filtrado de modelos en UI

- **Scopes autoritativos** = `aiEntitlementsService`. Contiene `allowedProviders` y `defaultProvider` por cuenta.
- **Resolver**: sólo selecciona un provider que esté en `allowedProviders` _y_ tenga API key disponible.
- **UI**: para evitar listar modelos no autorizados:
  1. Consumir un endpoint (ej. `/api/ai/entitlements/:accountId`) que devuelva `allowedProviders`.
  2. Filtrar catálogos de modelos por provider antes de mostrarlos (p.ej. si la cuenta sólo tiene `groq`, no renderizar secciones de OpenAI).
  3. Si un modelo requiere scopes adicionales (ej. `gpt-4o`), validar en backend al guardar el asistente y devolver error si no está en scopes. Esto evita inconsistencias incluso si alguien fuerza el UI.
- **Extensibilidad**: para nuevos scopes (ej. Anthropic) sólo se agrega provider en `AIProviderId`, se actualiza `PROVIDER_BASE_URLS`, `PROVIDER_ENV_KEYS` y `allowedProviders` en entitlements.

## 6. Notificaciones cuando la IA no responde

- Backend: `AIOrchestrator` emite `ai:execution_blocked` por WebSocket usando `broadcastToConversation` → `broadcastToRelationship` (mismo canal que mensajes). Esto garantiza que el owner reciba la alerta usando las mismas credenciales de relación.
- Frontend: `useWebSocket` compara `message.data.accountId` con `selectedAccountId` para mostrar toast **sólo al agente** (no al cliente Harold). Ejemplo de payload:

```json
{
  "type": "ai:execution_blocked",
  "data": {
    "conversationId": "033b1ffb-...",
    "accountId": "b7ad9719-...",    // owner/agent
    "block": {
      "reason": "insufficient_credits",
      "message": "El asistente \"Asistente por defecto\" usa OpenAI y no tenés créditos suficientes (balance: 0).",
      "creditBalance": 0,
      "requiredProvider": "openai"
    }
  }
}
```

## 7. Cómo extender o consultar desde UI

- **Saldo de créditos**: exponer endpoint sencillo (`GET /api/credits/:accountId`) que llame `creditsService.getBalance`. Útil para dashboards.
- **Sesiones activas**: `creditsService.getActiveConversationSession` puede mostrarse en UI para depurar consumo por conversación.
- **Historial / Ledger**: graficar `creditsLedger` para auditoría.
- **Scopes**: UI puede listar providers permitidos y bloquear toggles que no correspondan sin necesidad de duplicar lógica; backend seguirá rechazando cualquier request fuera de scope.
- **Model picker**: combinar entitlements + availability de API keys para construir combos dinámicos (OpenAI vs Groq). Si se agrega un provider nuevo, la UI sólo necesita mapearlo a friendly name.

## 8. Buenas prácticas

1. **Single entrypoint**: cualquier nueva lógica previa a la IA debe incorporarse en `resolveExecutionPlan` (no duplicar checks en `generateResponse`).
2. **Bloqueos explícitos**: siempre devolver `BlockedPlan` con `reason` + `message` human-readable + metadata (`requiredProvider`, `creditBalance`).
3. **WebSocket interno**: nunca insertar mensajes de sistema en la conversación cuando la IA no responde; usar `ai:execution_blocked` + toast.
4. **Scopes estrictos**: aunque la UI filtre, el backend debe seguir validando provider/model. Esto permite entornos multi-tenant seguros.
5. **Logs claros**: `ai-execution-plan` y `ai-orchestrator` loguean razones de bloqueo (útil para soporte). Mantener logs breves pero accionables.

---

Con esta arquitectura, la cadena de respuesta de IA mantiene una sola fuente de verdad, presenta feedback explícito al agente, y permite extender providers/modelos o reglas de créditos sin “romper” la UI ni duplicar lógica.
