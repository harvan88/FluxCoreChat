# HTP Session - 7 de Diciembre 2025

> **Modo**: Autónomo Completo  
> **Duración**: ~1 hora  
> **Estado**: ✅ Completado

---

## Hitos Completados

### 1. HITO-API-AUTOMATION
**Objetivo**: Crear rutas CRUD para automation_rules

**Endpoints implementados:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/automation/rules/:accountId` | Listar reglas de una cuenta |
| GET | `/automation/mode/:accountId` | Obtener modo efectivo |
| POST | `/automation/rules` | Crear/actualizar regla |
| POST | `/automation/trigger` | Registrar trigger |
| POST | `/automation/evaluate` | Evaluar trigger (testing) |
| DELETE | `/automation/rules/:ruleId` | Eliminar regla |
| PATCH | `/automation/rules/:ruleId` | Actualizar regla (parcial) |

**Archivo creado:** `apps/api/src/routes/automation.routes.ts`

---

### 2. HITO-EXTENSIONS-INTEGRATION
**Objetivo**: Conectar hooks del frontend con API real

**Cambios realizados:**

| Hook | Cambio |
|------|--------|
| `useExtensions` | Endpoints actualizados a rutas reales |
| `useAutomation` | Nuevo hook para gestión de automatización |

**Endpoints actualizados en useExtensions:**
- `GET /extensions` → Listar disponibles
- `GET /extensions/installed/:accountId` → Listar instaladas
- `DELETE /extensions/:accountId/:extensionId` → Desinstalar
- `POST /extensions/:accountId/:extensionId/enable` → Habilitar
- `POST /extensions/:accountId/:extensionId/disable` → Deshabilitar
- `PATCH /extensions/:accountId/:extensionId` → Actualizar config

**Archivos modificados/creados:**
- `apps/web/src/hooks/useExtensions.ts` (modificado)
- `apps/web/src/hooks/useAutomation.ts` (nuevo)

---

### 3. HITO-WEBSOCKET-SUGGESTIONS
**Objetivo**: WebSocket para sugerencias IA en tiempo real

**Nuevos tipos de mensaje WebSocket:**

| Tipo | Dirección | Descripción |
|------|-----------|-------------|
| `request_suggestion` | Cliente → Servidor | Solicitar sugerencia IA |
| `suggestion:generating` | Servidor → Cliente | Notificar generación en curso |
| `suggestion:ready` | Servidor → Cliente | Enviar sugerencia generada |
| `suggestion:disabled` | Servidor → Cliente | Automatización deshabilitada |
| `suggestion:auto_sending` | Servidor → Cliente | Envío automático pendiente |
| `approve_suggestion` | Cliente → Servidor | Aprobar y enviar sugerencia |
| `suggestion:approved` | Servidor → Cliente | Confirmación de envío |
| `discard_suggestion` | Cliente → Servidor | Descartar sugerencia |
| `suggestion:discarded` | Servidor → Cliente | Confirmación de descarte |

**Archivos modificados/creados:**
- `apps/api/src/websocket/ws-handler.ts` (modificado)
- `apps/web/src/hooks/useWebSocket.ts` (nuevo)

---

## Instrucciones de Prueba

### 1. Probar API de Automation

```bash
# Crear regla de automatización
curl -X POST http://localhost:3000/automation/rules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "UUID",
    "mode": "supervised"
  }'

# Obtener modo efectivo
curl http://localhost:3000/automation/mode/UUID \
  -H "Authorization: Bearer TOKEN"

# Evaluar trigger
curl -X POST http://localhost:3000/automation/evaluate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "UUID",
    "messageContent": "Hola!",
    "messageType": "incoming"
  }'
```

### 2. Probar WebSocket

```javascript
// Conectar
const ws = new WebSocket('ws://localhost:3000/ws');

// Suscribirse
ws.send(JSON.stringify({ type: 'subscribe', relationshipId: 'UUID' }));

// Solicitar sugerencia
ws.send(JSON.stringify({ 
  type: 'request_suggestion',
  conversationId: 'UUID',
  accountId: 'UUID'
}));

// Escuchar respuestas
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'suggestion:ready') {
    console.log('Sugerencia:', msg.data.suggestedText);
  }
};
```

### 3. Usar hooks en React

```tsx
import { useAutomation } from '../hooks/useAutomation';
import { useWebSocket } from '../hooks/useWebSocket';

function ChatComponent() {
  const { currentMode, setRule } = useAutomation(accountId);
  const { requestSuggestion, approveSuggestion } = useWebSocket({
    onSuggestion: (suggestion) => {
      console.log('Nueva sugerencia:', suggestion);
    }
  });

  // Solicitar sugerencia
  const handleRequestAI = () => {
    requestSuggestion({
      conversationId,
      accountId,
    });
  };
}
```

---

## Archivos Creados/Modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `apps/api/src/routes/automation.routes.ts` | Nuevo | Rutas CRUD automation |
| `apps/api/src/server.ts` | Mod | Registrar automationRoutes |
| `apps/api/src/websocket/ws-handler.ts` | Mod | Handlers sugerencias IA |
| `apps/web/src/hooks/useExtensions.ts` | Mod | Endpoints actualizados |
| `apps/web/src/hooks/useAutomation.ts` | Nuevo | Hook para automation |
| `apps/web/src/hooks/useWebSocket.ts` | Nuevo | Hook para WebSocket |

---

## Verificaciones

- [x] Build API exitoso
- [x] Build Web exitoso
- [x] Rutas automation registradas
- [x] WebSocket handlers implementados
- [x] Hooks frontend creados

---

## Próximos Pasos Sugeridos

| Tarea | Prioridad |
|-------|-----------|
| Conectar AI service real para sugerencias | ALTA |
| Tests E2E para flujo completo | MEDIA |
| UI para configurar automation rules | MEDIA |
| Rate limiting en automation | BAJA |

---

**Última actualización**: 2025-12-07
