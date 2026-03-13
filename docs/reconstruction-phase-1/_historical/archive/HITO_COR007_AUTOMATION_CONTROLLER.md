# Hito COR-007: Automation Controller

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **Prioridad**: Media  
> **Dependencias**: COR-001 (ExtensionHost Integration)

---

## Resumen

Implementación del Automation Controller según TOTEM 9.9.1, que controla el modo de respuesta automática de la IA.

---

## Modos de Automatización

| Modo | Descripción | Comportamiento |
|------|-------------|----------------|
| `automatic` | IA responde automáticamente | Extensiones procesan y envían respuesta |
| `supervised` | IA sugiere, humano aprueba | Extensiones generan sugerencia para revisión |
| `disabled` | Sin IA | No se procesan extensiones de IA |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      MessageCore                             │
├─────────────────────────────────────────────────────────────┤
│  1. Recibe mensaje                                          │
│  2. Persiste en DB                                          │
│  3. Evalúa AutomationController  ←── COR-007                │
│     ├─ disabled → Skip extensiones                          │
│     ├─ supervised → Procesa con flag "suggest"              │
│     └─ automatic → Procesa y envía                          │
│  4. Delega a ExtensionHost (si permitido)                   │
│  5. Notifica resultados                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Schema de Base de Datos

### Tabla `automation_rules`

```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  relationship_id UUID REFERENCES relationships(id),  -- NULL = global
  mode VARCHAR(20) NOT NULL DEFAULT 'supervised',
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### Configuración JSON

```typescript
interface AutomationConfig {
  triggers?: AutomationTrigger[];
  conditions?: AutomationCondition[];
  delayMs?: number;
  extensionId?: string;
  rateLimit?: number;
}
```

---

## API del AutomationController

### Obtener modo efectivo

```typescript
const mode = await automationController.getMode(accountId, relationshipId);
// Returns: 'automatic' | 'supervised' | 'disabled'
```

### Evaluar trigger

```typescript
const result = await automationController.evaluateTrigger({
  accountId: 'uuid',
  relationshipId: 'uuid',
  messageContent: 'Hola!',
  messageType: 'incoming',
  senderId: 'uuid',
});

// result:
// {
//   shouldProcess: true,
//   mode: 'automatic',
//   rule: AutomationRule | null,
//   reason: 'Processing in automatic mode'
// }
```

### Configurar regla

```typescript
// Regla global para account
await automationController.setRule(accountId, 'automatic');

// Regla específica para relationship
await automationController.setRule(accountId, 'supervised', {
  relationshipId: 'uuid',
  config: {
    triggers: [{ type: 'message_received' }],
    delayMs: 1000,
  }
});
```

### Registrar trigger

```typescript
await automationController.registerTrigger(accountId, {
  type: 'keyword',
  value: 'urgente|ayuda',
}, {
  relationshipId: 'uuid',
  mode: 'automatic',
});
```

---

## Integración con MessageCore

El `MessageCore.receive()` ahora:

1. Persiste el mensaje
2. **Evalúa AutomationController** (COR-007)
3. Solo delega a ExtensionHost si `shouldProcess === true`
4. Pasa `automationMode` a extensiones
5. Incluye `automation` en el resultado

```typescript
const result = await messageCore.receive(envelope);
// result.automation = { shouldProcess, mode, rule, reason }
```

---

## Tipos de Triggers

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `message_received` | Cualquier mensaje incoming | - |
| `keyword` | Coincide con patrón regex | `urgente|ayuda` |
| `schedule` | Por horario (cron) | `0 9 * * *` (pendiente) |
| `webhook` | Trigger externo | URL callback (pendiente) |

---

## Tipos de Condiciones

| Campo | Operadores | Ejemplo |
|-------|------------|---------|
| `message_type` | equals | `incoming` |
| `sender` | equals, contains | Account ID |
| `message_content` | contains, regex | `hola.*mundo` |
| `time_of_day` | between | `9-17` (9am-5pm) |

---

## Prioridad de Reglas

1. Regla específica del relationship (si existe)
2. Regla global del account (si existe)
3. Modo por defecto: `supervised`

---

## Instrucciones para Pruebas Manuales

### 1. Crear regla de automatización

```bash
# Crear regla global para una cuenta
curl -X POST http://localhost:3000/automation/rules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid",
    "mode": "automatic"
  }'
```

### 2. Verificar en base de datos

```sql
SELECT * FROM automation_rules WHERE account_id = 'uuid';
```

### 3. Enviar mensaje y verificar comportamiento

Con `mode: 'disabled'`, el log debe mostrar:
```
[MessageCore] Automation disabled for uuid: Automation disabled for this account/relationship
```

---

## Archivos Creados/Modificados

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/automation-rules.ts` | Nuevo schema |
| `packages/db/src/schema/index.ts` | Export añadido |
| `packages/db/src/run-migration-010-automation-rules.ts` | Migración |
| `apps/api/src/services/automation-controller.service.ts` | Nuevo servicio |
| `apps/api/src/services/extension-host.service.ts` | `automationMode` añadido |
| `apps/api/src/core/message-core.ts` | Integración con AutomationController |

---

## Checklist de Validación

- [x] Schema `automation_rules` creado
- [x] Migración ejecutada exitosamente
- [x] AutomationController implementado con:
  - [x] `getMode()`
  - [x] `evaluateTrigger()`
  - [x] `setRule()`
  - [x] `registerTrigger()`
  - [x] `executeWorkflow()`
- [x] Integración con MessageCore
- [x] Build de API exitoso
- [x] Documentación completa

---

## Estado del Backlog

| ID | Descripción | Estado |
|----|-------------|--------|
| COR-001 | ExtensionHost Integration | ✅ |
| COR-002 | Message Status | ✅ |
| COR-003 | from/to_actor_id | ✅ |
| COR-004 | Actor Model | ✅ |
| COR-005 | Alias en accounts | ✅ |
| COR-006 | Validación límites | ✅ |
| **COR-007** | **Automation Controller** | ✅ |
| C3 | Offline-First | ✅ |

---

**Última actualización**: 2025-12-06
