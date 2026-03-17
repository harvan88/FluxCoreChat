# Análisis de Arquitectura: Modos de IA - Legacy vs FluxCore

## 🎯 Objetivo
Identificar y documentar las arquitecturas paralelas que manejan los modos de automatización en el sistema, detectando código legacy y nuevo que compiten entre sí.

---

## 📋 Descubrimiento Clave

### 🔴 **ARQUITECTURA LEGACY - Automation Rules**
**Ubicación**: `packages/db/src/schema/automation-rules.ts`

```typescript
// Sistema ANTIGUO pero todavía existente
export const automationRules = pgTable('automation_rules', {
  accountId: uuid('account_id').notNull(),
  relationshipId: uuid('relationship_id'), // ← null = global, específico = por conversación
  mode: varchar('mode').notNull().default('supervised'), // 'automatic' | 'supervised' | 'disabled'
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').$type<AutomationConfig>(),
});

// Prioridad: relationship > account global > default
async getMode(accountId: string, relationshipId?: string): Promise<AutomationMode> {
  const rule = await this.getEffectiveRule(accountId, relationshipId);
  return (rule?.mode as AutomationMode) || 'supervised';
}
```

**Endpoints Legacy**:
- `GET /automation/mode/:accountId?relationshipId=xxx`
- `PATCH /automation/mode`

**Mapeo de Modos Legacy → FluxCore**:
- `automatic` → `auto`
- `supervised` → `suggest`  
- `disabled` → `off`

---

### 🟢 **ARQUITECTURA FLUXCORE - Assistant Mode**
**Ubicación**: `apps/web/src/hooks/fluxcore/useAssistantMode.ts`

```typescript
// Sistema NUEVO pero incompleto
export function useAssistantMode(accountId: string | null) {
  const [mode, setModeState] = useState<AssistantMode>('off');
  
  const setMode = useCallback(async (newMode: AssistantMode) => {
    // 🔥 PROBLEMA: Solo maneja modo GLOBAL, no por conversación
    const res = await api.setAssistantMode(accountId, newMode);
    // ...
  }, [accountId]);
}
```

**Endpoints FluxCore**:
- `GET /fluxcore/assistants/active-mode?accountId=xxx`
- `PATCH /fluxcore/assistants/active-mode`

**Base de Datos FluxCore**:
```typescript
// fluxcore-assistants.ts
timingConfig: {
  mode: 'auto' | 'suggest' | 'off', // ← Solo a nivel de assistant, no por conversación
}

// fluxcore-account-policies.ts  
mode: 'auto' | 'suggest' | 'off', // ← Solo a nivel de cuenta, no por conversación
```

---

## 🚨 **PROBLEMA: Doble Fuente de Verdad**

### Frontend Actual - Usa FluxCore (incompleto)
```typescript
// ConversationsList.tsx - LÍNEA 103-108
const getEffectiveAIMode = (_relationshipId: string): AssistantMode => globalAIMode;

const toggleConversationAIMode = async (_relationshipId: string, currentMode: AssistantMode) => {
  const nextMode: AssistantMode = currentMode === 'auto' ? 'off' : 'auto';
  await setMode(nextMode); // 🔥 CAMBIA MODO GLOBAL, NO ESPECÍFICO
};
```

### Comportamiento Esperado vs Real
| Componente | Esperado (Legacy) | Real (FluxCore) | Problema |
|-----------|------------------|------------------|---------|
| Header/Sidebar | Modo global | ✅ Modo global | ✅ OK |
| Botón individual | Modo por conversación | ❌ Modo global | 🚨 ROto |
| Prioridad | relationship > global | ❌ Solo global | 🚨 Faltante |

---

## 🔄 **Flujo de Datos Actual**

### 🟡 **Frontend (Confundido)**
```
Usuario clickea botón individual 
    ↓
useAssistantMode.setMode() // Cambia modo GLOBAL
    ↓  
/api/fluxcore/assistants/active-mode // Endpoint FluxCore
    ↓
fluxcore_assistants.timingConfig.mode // Solo global
```

### 🔴 **Backend (Dos sistemas paralelos)**
```
Automation Rules (Legacy):
  GET /automation/mode?relationshipId=xxx  // ✅ Existe pero no se usa
  → automationRules con prioridad relationship > global

FluxCore (Nuevo):
  GET /fluxcore/assistants/active-mode     // ✅ Se usa pero incompleto
  → fluxcore_assistants.timingConfig.mode   // Solo global
```

---

## 📊 **Estado de los Componentes**

### Componentes UI Analizados

#### 1. **FluxCoreComposer** (`extensions/fluxcore/components/FluxCoreComposer.tsx`)
```typescript
// ✅ Usa sistema FluxCore (nuevo)
const { mode: currentMode, setMode: setModeOnAssistant } = useAssistantMode(props.accountId ?? null);

// ❌ Problema: No sabe de modos por conversación
const effectiveAIMode: AssistantMode = props.accountId ? (currentMode === 'off' ? 'off' : currentMode) : 'off';
```

#### 2. **AIStatusHeader** (`components/conversations/AIStatusHeader.tsx`)
```typescript
// ✅ Usa sistema FluxCore (nuevo)
const { mode, setMode, isLoading } = useAssistantMode(accountId);

// ❌ Problema: Solo afecta modo global
```

#### 3. **AIStatusIndicator** (`components/conversations/AIStatusIndicator.tsx`)
```typescript
// ✅ Diseñado para modo específico pero...
interface AIStatusIndicatorProps {
  mode: AssistantMode;  // ← Debería venir de conversación específica
  onToggle: (e: React.MouseEvent) => void; // ← Debería cambiar modo específico
}

// ❌ Pero en ConversationsList.tsx se usa global:
const toggleConversationAIMode = async (_relationshipId: string, currentMode: AssistantMode) => {
  await setMode(nextMode); // ← GLOBAL, no específico
};
```

#### 4. **ConversationsList.tsx**
```typescript
// 🚨 PROBLEMA CENTRAL
const { mode: globalAIMode, setMode } = useAssistantMode(selectedAccountId);

// Los botones individuales llaman a esto:
const toggleConversationAIMode = async (_relationshipId: string, currentMode: AssistantMode) => {
  await setMode(nextMode); // ← Debería ser setConversationMode(conversationId, mode)
};
```

---

## 🔍 **ChatCore - El Espacio Prestado**

### ✅ **Lo que ChatCore SÍ sabe**
```typescript
// MessageBubble.tsx
{message.generatedBy === 'ai' && (
  // Badge de IA
)}

if (message.generatedBy === 'system') {
  // Mensajes de sistema (ai_blocked, etc.)
}

// message-core.ts
generatedBy: envelope.generatedBy || 'human', // 'human' | 'ai' | 'system'
```

### ❌ **Lo que ChatCore NO sabe**
- Configuración de modos (auto/suggest/off)
- Cuándo debe responder IA
- Políticas de automatización por conversación

---

## 🎯 **Arquitectura Deseada vs Real**

### ✅ **Arquitectura Deseada (Como el usuario describió)**
```
FluxCore (Dueño de la UI):
├── Componentes de control (Composer, Headers, Indicators)
├── Configuración de modos (global + por conversación)
├── Lógica de decisión (cuándo responder IA)

ChatCore (Espacio prestado):
├── Renderizado de mensajes
├── Badges de IA (generatedBy)
├── Persistencia y WebSocket
└── No sabe de configuración de modos

Inyección por "slots":
└── FluxCore inyecta sus componentes en el espacio de ChatCore
```

### ❌ **Arquitectura Real Actual**
```
🔴 LEGACY (Automation Rules):
├── ✅ Soporta modos por conversación
├── ✅ Prioridad relationship > global  
├── ❌ No se usa en frontend

🟢 FLUXCORE (Assistant Mode):
├── ✅ Se usa en frontend
├── ❌ Solo soporta modo global
├── ❌ Sin prioridad relationship > global

🟡 FRONTEND (Confundido):
├── Usa FluxCore pero espera comportamiento Legacy
├── Botones individuales cambian modo global
├── No hay doble nivel de control funcional
```

---

## 🚨 **Problemas Críticos Identificados**

### 1. **Frontend Miente al Usuario**
- Botones individuales parecen controlar conversaciones específicas
- Realmente cambian el modo global de toda la cuenta
- No hay forma de tener conversaciones con diferentes modos

### 2. **Doble Implementación Paralela**
- Automation Rules (legacy): Completa pero desconectada
- Assistant Mode (nueva): Conectada pero incompleta
- No hay migración planificada

### 3. **Inconsistencia de Nomenclatura**
- Legacy: `automatic`/`supervised`/`disabled`
- FluxCore: `auto`/`suggest`/`off`
- Sin mapeo automático en frontend

### 4. **Falta de Prioridad**
- Legacy soporta `relationshipId > accountId`
- FluxCore solo soporta `accountId`
- No se puede tener modo específico por conversación

---

## 🔧 **Soluciones Propuestas**

### Opción 1: **Migrar a FluxCore (Recomendada)**
```typescript
// 1. Extender fluxcore_assistants para soportar relationshipId
ALTER TABLE fluxcore_assistants ADD COLUMN relationship_id UUID REFERENCES relationships(id);

// 2. Modificar getActiveMode para prioridad relationship > global
async getActiveMode(accountId: string, relationshipId?: string) {
  // Primero buscar específico del relationship
  // Luego buscar global del account
}

// 3. Actualizar frontend para usar relationshipId
const toggleConversationAIMode = async (conversationId: string, relationshipId: string) => {
  await api.setAssistantMode(accountId, mode, { relationshipId });
};
```

### Opción 2: **Volver a Automation (Legacy)**
```typescript
// 1. Conectar frontend a endpoints /automation/mode
// 2. Mapear modos: auto→automatic, suggest→supervised, off→disabled
// 3. Deprecarar fluxcore_assistants.timingConfig.mode
```

### Opción 3: **Híbrida (Riesgosa)**
- Mantener ambas pero definir cuál cuándo
- Alta complejidad y confusión

---

## 📈 **Impacto en el Sistema**

### Componentes Afectados
- `FluxCoreComposer` - Necesita saber de relationshipId
- `AIStatusHeader` - Debe seguir siendo global
- `AIStatusIndicator` - Debe ser específico por conversación
- `ConversationsList` - Necesita lógica de prioridad

### Endpoints Afectados
- `/fluxcore/assistants/active-mode` - Necesita `relationshipId?`
- `/automation/mode` - Podría deprecarse o usarse como fallback

### Base de Datos
- `fluxcore_assistants` - Necesita `relationship_id`
- `automation_rules` - Podría migrarse o deprecarse

---

## 🎯 **Conclusión**

**Hay claramente dos arquitecturas paralelas compitiendo**:

1. **Automation Rules (Legacy)**: Completa, soporta modos por conversación, pero desconectada del frontend
2. **Assistant Mode (FluxCore)**: Conectada al frontend, pero solo soporta modo global

**El frontend actual está usando FluxCore pero esperando comportamiento Legacy**, lo que causa la confusión que el usuario detectó.

**Se necesita una decisión estratégica**: migrar completamente a FluxCore extendiéndola para soportar modos por conversación, o volver a Automation y depreciar FluxCore.

---

## 📅 **Fecha del Análisis**
2026-03-17

## 🔍 **Herramientas Usadas**
- Búsqueda de código con grep
- Análisis de schemas de base de datos
- Revisión de componentes UI
- Análisis de endpoints API
