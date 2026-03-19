# Manifiesto del Runtime Pipeline (v8.3)

**Fecha:** 2026-03-17  
**Propósito:** Extender el Live Cognitive Pipeline existente con profundidad en la fase Runtime  
**Integración con:** Live Cognitive Pipeline del Sistema FluxCore  

---

## 🎯 El Problema: Falta de Profundidad

El **Live Cognitive Pipeline** actual es perfecto a nivel de arquitectura (7 nodos), pero el **nodo 4 (Runtime)** es una caja negra:

```
4. Runtime: La IA (Local o Cloud) analiza el contexto y genera una propuesta de acción.
```

**Necesitamos abrir esta caja negra** para ver qué pasa realmente dentro del runtime local.

---

## 🎯 **Clarificación Fundamental: Kernel vs Sistema**

### **🔍 El Rol del Kernel en el Pipeline:**
El **Kernel no es el origen de las señales**, sino el **almacenamiento de verdad** y **puntos de entrada/salida**:

```
Mensajes Externos → ChatCoreGateway → Kernel.ingestSignal() → Sistema
                                                      ↓
                                              ChatProjector → CognitionWorker
                                                      ↓
                                              CognitiveDispatcher → Runtime
                                                      ↓
                                              ActionExecutor → CognitionGateway
                                                      ↓
                                              Kernel.ingestSignal() → Mensajes
```

### **📋 Verdad Arquitectónica:**
- **Las señales NO son "del Kernel"**
- **Las señales son "del Sistema/ Pipeline"** 
- **El Kernel es el registro canónico** donde se certifican y almacenan
- **El Kernel es起点/终点** (punto de partida y llegada), NO el pipeline completo

### **✅ Terminología Correcta:**
- **"Live Cognitive Pipeline del Sistema"** ✅
- **"Señales del Pipeline/ Sistema"** ✅  
- **"Trazabilidad del Sistema"** ✅

### **❌ Terminología Incorrecta:**
- **"Señales del Kernel"** ❌
- **"Live Cognitive Pipeline del Kernel"** ❌
- **"Trazabilidad del Kernel"** ❌

---

## 🔧 Integración con Live Cognitive Pipeline

### Pipeline Actual (7 Nodos)
```
1. Ingreso (800) → 2. Proyección → 3. Worker → 4. Runtime → 5. Dispatcher → 6. Certificación → 7. Entrega
```

### Pipeline Extendido (Runtime Profundizado)
```
1. Ingreso (800) → 2. Proyección → 3. Worker → 
4. Runtime {
  4.1 Input Validation (401)
  4.2 Policy Gate (402) 
  4.3 Prompt Building (403)
  4.4 Tool Selection (404)
  4.5 LLM Completion (405)
  4.6 Tool Execution (406)
  4.7 Action Resolution (407)
}
→ 5. Dispatcher → 6. Certificación → 7. Entrega
```

**El nodo 4 ahora tiene 7 sub-nodos internos** con su propia traza.

---

## 🏗️ Sub-nodos del Runtime (Fase 4)

### Sub-nodo 4.1: Input Validation (401)
```typescript
{
  subPhase: 'input_validation',
  status: 'started|completed|failed',
  timestamp: Date,
  triggerSignalId: string, // Heredado del pipeline principal
  data: {
    policyContext: { mode, tone, windows },
    runtimeConfig: { runtime, model, provider },
    conversationHistory: { count, lastMessage }
  }
}
```

### Sub-nodo 4.2: Policy Gate (402)
```typescript
{
  subPhase: 'policy_gate',
  status: 'passed|blocked',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    mode: 'auto|suggest|off',
    loopPrevention: true|false,
    lastMessageRole: 'user|assistant|system'
  }
}
```

### Sub-nodo 4.3: Prompt Building (403)
```typescript
{
  subPhase: 'prompt_building',
  status: 'started|completed',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    systemPromptLength: number,
    messagesCount: number,
    instructionsCount: number,
    ragAvailable: boolean,
    templatesAvailable: boolean
  }
}
```

### Sub-nodo 4.4: Tool Selection (404)
```typescript
{
  subPhase: 'tool_selection',
  status: 'started|completed',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    toolsOffered: string[], // ['search_knowledge', 'send_template']
    hasRAG: boolean,
    hasTemplates: boolean,
    toolChoice: 'auto|none'
  }
}
```

### Sub-nodo 4.5: LLM Completion (405)
```typescript
{
  subPhase: 'llm_completion',
  status: 'started|completed|failed',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    provider: 'openai'|'groq',
    model: string,
    tokensUsed: number,
    responseTime: number,
    toolCallsDetected: boolean,
    finishReason: 'stop'|'tool_calls'|'length'
  }
}
```

### Sub-nodo 4.6: Tool Execution (406) - 🚨 CRÍTICO
```typescript
{
  subPhase: 'tool_execution',
  status: 'started|completed|failed|skipped',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    toolCallId: string,
    toolName: 'search_knowledge'|'send_template',
    round: number, // 1, 2
    executionTime: number,
    result: 'success'|'error',
    violations: ['direct_http_call'] // Detectados aquí
  }
}
```

### Sub-nodo 4.7: Action Resolution (407)
```typescript
{
  subPhase: 'action_resolution',
  status: 'started|completed',
  timestamp: Date,
  triggerSignalId: string,
  data: {
    actionType: 'send_message'|'send_template'|'no_action',
    contentLength: number,
    templateId?: string,
    executionTime: number
  }
}
```

---

## � Integración con Live Cognitive Pipeline

### Propagación del triggerSignalId
La clave es que **todos los sub-nodos heredan el `triggerSignalId`** del pipeline principal:

```typescript
// En cognitive-dispatcher.service.ts
const runtime = getRuntime(composition.assistant.runtime);

// El runtime recibe el triggerSignalId del turno
const runtimeInput: RuntimeInput = {
  policyContext,
  runtimeConfig: composition.assistant,
  conversationHistory,
  triggerSignalId // ← Heredado del Live Cognitive Pipeline
};

// El runtime propaga este ID a todos sus sub-nodos
```

### Extensión de ai_traces
```sql
-- Extender ai_traces para incluir sub-nodos del runtime
ALTER TABLE ai_traces ADD COLUMN sub_phase TEXT;
ALTER TABLE ai_traces ADD COLUMN sub_phase_data JSONB;
ALTER TABLE ai_traces ADD COLUMN violations JSONB;
```

### Visualización Unificada
```
Live Cognitive Pipeline: triggerSignalId=abc-123
├── ✅ 1. Ingreso (800) - 2ms
├── ✅ 2. Proyección (801) - 5ms  
├── ✅ 3. Worker (802) - 10ms
├── 🔄 4. Runtime (803-809) - 1,500ms
│   ├── ✅ 4.1 Input Validation (401) - 2ms
│   ├── ✅ 4.2 Policy Gate (402) - 1ms - mode: auto
│   ├── ✅ 4.3 Prompt Building (403) - 15ms - 3 instructions
│   ├── ✅ 4.4 Tool Selection (404) - 3ms - RAG: yes
│   ├── ✅ 4.5 LLM Completion (405) - 1,200ms - Groq: 8B
│   ├── ⚠️ 4.6 Tool Execution (406) - 150ms - VIOLACIÓN: direct_http_call
│   └── ✅ 4.7 Action Resolution (407) - 5ms - send_message
├── ✅ 5. Dispatcher (810) - 20ms
├── ✅ 6. Certificación (811) - 5ms
└── ✅ 7. Entrega (812) - 10ms
```

---

## 🏗️ **Signal Hub Architecture: Extensibilidad de Señales sin Cambios Críticos**

### **🔍 Problema Actual:**
Cada nueva señal requiere cambios en múltiples lugares críticos:
- WebSocket handlers
- Message types  
- Frontend components
- Database schemas

### **📋 Solución: Signal Hub Centralizado**
Crear un "Signal Hub" que actúe como conector universal entre el sistema y los consumidores de señales.

```typescript
// Signal Hub - Conector Universal
interface SignalHub {
  // Registro dinámico de señales
  registerSignal(signalDefinition: SignalDefinition): void;
  
  // Enrutamiento automático
  routeSignal(signal: Signal): Promise<void>;
  
  // Broadcast a consumidores registrados
  broadcast(signalType: string, payload: any): Promise<void>;
}
```

### **🎯 Arquitectura del Signal Hub:**

#### **1. Signal Registry (Registro Dinámico)**
```typescript
// Registro Centralizado de Señales
interface SignalDefinition {
  id: string;
  name: string;
  schema: z.ZodSchema; // Validación de tipos
  category: 'runtime' | 'system' | 'ui' | 'debug';
  consumers: string[]; // Quién puede consumir esta señal
  persistence: 'immediate' | 'batch' | 'none';
  priority: 'high' | 'medium' | 'low';
}

class SignalRegistry {
  private signals = new Map<string, SignalDefinition>();
  
  register(definition: SignalDefinition): void {
    this.signals.set(definition.id, definition);
    // Auto-registrar en WebSocket si es necesario
    this.setupWebSocketRouting(definition);
  }
  
  get(id: string): SignalDefinition | undefined {
    return this.signals.get(id);
  }
}
```

#### **2. Signal Bus (Bus Central)**
```typescript
// Bus Unificado de Señales
class SignalBus {
  private consumers = new Map<string, SignalConsumer[]>();
  private middleware: SignalMiddleware[] = [];
  
  async emit(signalType: string, payload: any): Promise<void> {
    const definition = signalRegistry.get(signalType);
    if (!definition) throw new Error(`Signal ${signalType} not registered`);
    
    // Validar schema
    const validated = definition.schema.parse(payload);
    
    // Aplicar middleware
    for (const middleware of this.middleware) {
      await middleware.process(signalType, validated);
    }
    
    // Enrutar a consumidores
    const consumers = this.consumers.get(signalType) || [];
    await Promise.all(consumers.map(c => c.consume(validated)));
  }
  
  subscribe(signalType: string, consumer: SignalConsumer): void {
    if (!this.consumers.has(signalType)) {
      this.consumers.set(signalType, []);
    }
    this.consumers.get(signalType)!.push(consumer);
  }
}
```

#### **3. Dynamic WebSocket Router**
```typescript
// Router Dinámico para WebSocket
class DynamicWebSocketRouter {
  constructor(private signalBus: SignalBus) {}
  
  setupRouting(definition: SignalDefinition): void {
    // Auto-configurar rutas WebSocket basadas en definición
    if (definition.consumers.includes('websocket')) {
      this.signalBus.subscribe(definition.id, new WebSocketConsumer(definition));
    }
  }
}

class WebSocketConsumer implements SignalConsumer {
  constructor(private definition: SignalDefinition) {}
  
  async consume(signal: any): Promise<void> {
    // Broadcast automático a clientes WebSocket
    const payload = {
      type: this.definition.id,
      category: this.definition.category,
      data: signal,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast solo a clientes autorizados
    websocketService.broadcastToAuthorized(payload, this.definition.consumers);
  }
}
```

### **🔧 Implementación Práctica:**

#### **Registro de Señales de Runtime**
```typescript
// signals/runtime.signals.ts
export const runtimeSignals = [
  {
    id: 'runtime.sub_phase.started',
    name: 'Runtime Sub-Phase Started',
    schema: z.object({
      subPhase: z.string(),
      triggerSignalId: z.string(),
      data: z.any()
    }),
    category: 'runtime',
    consumers: ['websocket', 'monitoring', 'tracing'],
    persistence: 'immediate',
    priority: 'medium'
  },
  
  {
    id: 'runtime.violation.detected',
    name: 'Runtime Violation Detected',
    schema: z.object({
      violation: z.string(),
      subPhase: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical'])
    }),
    category: 'runtime',
    consumers: ['websocket', 'monitoring', 'alerting'],
    persistence: 'immediate',
    priority: 'high'
  }
];

// Auto-registro al iniciar el sistema
runtimeSignals.forEach(signal => signalRegistry.register(signal));
```

#### **Emisión de Señales (Runtime)**
```typescript
// En AsistentesLocalRuntime
class AsistentesLocalRuntime implements RuntimeAdapter {
  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    // 4.1 Input Validation
    await signalBus.emit('runtime.sub_phase.started', {
      subPhase: 'input_validation',
      triggerSignalId: input.triggerSignalId,
      data: { policyContext: input.policyContext }
    });
    
    // 4.6 Tool Execution con violación
    if (violationDetected) {
      await signalBus.emit('runtime.violation.detected', {
        violation: 'direct_http_call',
        subPhase: 'tool_execution',
        severity: 'medium'
      });
    }
  }
}
```

#### **Consumidores Automáticos**
```typescript
// consumers/monitoring.consumer.ts
export class MonitoringConsumer implements SignalConsumer {
  async consume(signal: any): Promise<void> {
    // Almacenar en ai_traces automáticamente
    if (signal.type.startsWith('runtime.')) {
      await db.insert(aiTraces).values({
        triggerSignalId: signal.data.triggerSignalId,
        phase: 'runtime',
        subPhase: signal.data.subPhase,
        data: signal.data,
        timestamp: new Date()
      });
    }
  }
}

// Auto-registro
signalBus.subscribe('runtime.sub_phase.started', new MonitoringConsumer());
signalBus.subscribe('runtime.violation.detected', new MonitoringConsumer());
```

### **🎯 Beneficios de esta Arquitectura:**

#### **✅ Extensibilidad sin Cambios Críticos:**
- **Nuevas señales** = Solo registrar en SignalRegistry
- **WebSocket auto-configura** basado en definición
- **Consumidores se registran** automáticamente
- **Schema validation** previene errores

#### **✅ Mantenimiento Centralizado:**
- **Un solo lugar** para definir señales
- **Middleware centralizado** para lógica común
- **Routing automático** a consumidores apropiados
- **Validación de tipos** en tiempo de ejecución

#### **✅ Flexibilidad Máxima:**
- **Prioridades** para manejo de señales
- **Categorías** para agrupamiento lógico
- **Consumidores selectivos** basados en permisos
- **Persistence configurable** por tipo de señal

### **🔧 Implementación Gradual:**

#### **Phase 1: Signal Registry**
```typescript
// Crear SignalRegistry y SignalBus
// Migrar señales existentes al nuevo sistema
// Configurar auto-routing básico
```

#### **Phase 2: Dynamic WebSocket**
```typescript
// Implementar DynamicWebSocketRouter
// Auto-configurar rutas basadas en registry
// Migrar consumers existentes
```

#### **Phase 3: Advanced Features**
```typescript
// Middleware para logging, metrics, filtering
// Signal prioritization y batching
// Consumer permissions y authorization
```

### **📋 Ejemplo: Agregar Nueva Señal**

#### **Antes (Cambios Múltiples):**
```typescript
// 1. Modificar WebSocket handler
// 2. Agregar tipo en frontend
// 3. Modificar schema DB
// 4. Actualizar lógica de routing
```

#### **Despues (Solo Registro):**
```typescript
// Solo agregar al registro
signalRegistry.register({
  id: 'runtime.new_feature.started',
  name: 'New Feature Started',
  schema: z.object({ featureId: z.string() }),
  category: 'runtime',
  consumers: ['websocket', 'monitoring'],
  persistence: 'immediate',
  priority: 'medium'
});

// Y emitir donde sea necesario
await signalBus.emit('runtime.new_feature.started', { featureId: 'abc' });
```

---

## 🛠️ Implementación Minimalista

### 1. Runtime Sub-phase Tracer (Integrado con Signal Hub)
```typescript
export class RuntimeSubPhaseTracer {
  constructor(
    private triggerSignalId: string,
    private signalBus: SignalBus
  ) {}
  
  async traceSubPhase(
    subPhase: string,
    status: string,
    data: any,
    violations?: string[]
  ): Promise<void> {
    // Usar Signal Hub en lugar de inserción directa
    await this.signalBus.emit('runtime.sub_phase.trace', {
      triggerSignalId: this.triggerSignalId,
      subPhase,
      status,
      data: {
        ...data,
        violations: violations || []
      },
      timestamp: new Date()
    });
  }
}
```

### 2. AsistentesLocalRuntime Extendido (Usando Signal Hub)
```typescript
export class AsistentesLocalRuntime implements RuntimeAdapter {
  readonly runtimeId = 'asistentes-local';
  
  constructor(private signalBus: SignalBus) {}
  
  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    const tracer = new RuntimeSubPhaseTracer(input.triggerSignalId, this.signalBus);
    
    // 4.1 Input Validation
    await tracer.traceSubPhase('input_validation', 'started', {
      policyContext: input.policyContext,
      runtimeConfig: input.runtimeConfig
    });
    
    // 4.2 Policy Gate
    if (input.policyContext.mode === 'off') {
      await tracer.traceSubPhase('policy_gate', 'blocked', {
        mode: input.policyContext.mode
      });
      return [{ type: 'no_action', reason: 'Automation mode is off' }];
    }
    
    // 4.3 Prompt Building
    const { systemPrompt, messages } = promptBuilder.build({...});
    await tracer.traceSubPhase('prompt_building', 'completed', {
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length
    });
    
    // 4.4 Tool Selection
    const tools = [];
    if (hasRAG) tools.push('search_knowledge');
    if (hasTemplates) tools.push('send_template');
    
    await tracer.traceSubPhase('tool_selection', 'completed', {
      toolsOffered: tools,
      hasRAG,
      hasTemplates
    });
    
    // 4.5 LLM Completion
    const result = await llmClient.complete({...});
    await tracer.traceSubPhase('llm_completion', 'completed', {
      provider,
      model,
      tokensUsed: result.usage?.totalTokens,
      toolCallsDetected: !!result.toolCalls
    });
    
    // 4.6 Tool Execution (con detección de violaciones)
    if (result.toolCalls) {
      for (const toolCall of result.toolCalls) {
        const violations = [];
        
        if (toolCall.function.name === 'search_knowledge') {
          violations.push('direct_http_call');
        }
        
        await tracer.traceSubPhase('tool_execution', 'completed', {
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          violations
        }, violations);
      }
    }
    
    // 4.7 Action Resolution
    await tracer.traceSubPhase('action_resolution', 'completed', {
      actionType: 'send_message',
      contentLength: result.content?.length || 0
    });
    
    return [{
      type: 'send_message',
      conversationId: input.policyContext.conversationId,
      content: result.content
    }];
  }
}
```

### 3. Integración con Signal Hub (Inicialización)
```typescript
// En el bootstrap del sistema
const signalRegistry = new SignalRegistry();
const signalBus = new SignalBus(signalRegistry);

// Registrar señales de runtime
runtimeSignals.forEach(signal => signalRegistry.register(signal));

// Registrar consumidores automáticos
signalBus.subscribe('runtime.sub_phase.trace', new MonitoringConsumer());
signalBus.subscribe('runtime.violation.detected', new AlertingConsumer());

// Configurar router dinámico WebSocket
const wsRouter = new DynamicWebSocketRouter(signalBus);

// Inyectar Signal Hub en el runtime
const runtime = new AsistentesLocalRuntime(signalBus);
```

### 4. Extension de ai_traces (Mantener compatibilidad)
```sql
-- Extender ai_traces para incluir sub-nodos del runtime
ALTER TABLE ai_traces ADD COLUMN sub_phase TEXT;
ALTER TABLE ai_traces ADD COLUMN sub_phase_data JSONB;
ALTER TABLE ai_traces ADD COLUMN violations JSONB;
```

### 5. MonitoringConsumer Adaptado
```typescript
export class MonitoringConsumer implements SignalConsumer {
  async consume(signal: any): Promise<void> {
    // Mantener compatibilidad con ai_traces existente
    if (signal.type === 'runtime.sub_phase.trace') {
      await db.insert(aiTraces).values({
        triggerSignalId: signal.triggerSignalId,
        phase: 'runtime',
        subPhase: signal.subPhase,
        status: signal.status,
        data: signal.data,
        violations: signal.data.violations || [],
        timestamp: new Date(signal.timestamp)
      });
    }
  }
}
```

---

## 🎯 Conclusión: Integración Perfecta con Signal Hub

### ¿Qué logramos con esta extensión?

1. **Sin duplicar el pipeline** - Extendemos el existente
2. **Profundidad donde se necesita** - Abrimos la caja negra del Runtime
3. **Misma traza unificada** - `triggerSignalId` conecta todo
4. **Detección de violaciones** - En tiempo real, en sub-fase específica
5. **Visualización completa** - 7 nodos principales + 7 sub-nodos del runtime
6. **Claridad conceptual** - Distinguimos Kernel (almacenamiento) vs Sistema (pipeline)
7. **Extensibilidad infinita** - Signal Hub permite agregar señales sin cambios críticos
8. **Mantenimiento centralizado** - Un solo lugar para definir y enrutar señales
9. **Validación de tipos** - Schema validation previene errores en tiempo de ejecución
10. **Auto-configuración** - WebSocket y consumidores se configuran automáticamente

### Principio Arquitectónico Fundamental:

**El Kernel es el registro canónico de verdad, pero el Live Cognitive Pipeline es el sistema vivo que procesa la cognición.**

```
🔍 CORRECCIÓN CONCEPTUAL:

❌ INCORRECTO: "Las señales del Kernel..."
✅ CORRECTO: "Las señales del Sistema que se certifican en el Kernel..."

❌ INCORRECTO: "Trazabilidad del Kernel..."  
✅ CORRECTO: "Trazabilidad del Sistema con almacenamiento en Kernel..."

❌ INCORRECTO: "Live Cognitive Pipeline del Kernel..."
✅ CORRECTO: "Live Cognitive Pipeline del Sistema FluxCore..."
```

### Beneficios Inmediatos

- **Trazabilidad completa** del runtime local
- **Detección automática** de violaciones del Canon
- **Debugging preciso** por sub-fase
- **Métricas de performance** donde realmente importa
- **Claridad conceptual** sobre roles de Kernel vs Sistema
- **Integración perfecta** con Live Cognitive Pipeline existente

### Implementación Phased (Actualizada con Signal Hub)

**Phase 1 (Inmediata):**
- Crear SignalRegistry y SignalBus
- Extender `ai_traces` con `sub_phase` y `violations`
- Implementar `RuntimeSubPhaseTracer` integrado con Signal Hub
- Modificar `AsistentesLocalRuntime` para usar Signal Hub

**Phase 2 (Signal Hub Completo):**
- Implementar DynamicWebSocketRouter
- Crear definiciones de señales declarativas
- Migrar consumidores existentes al nuevo modelo
- Configurar auto-routing basado en registry

**Phase 3 (Visualización y Corrección):**
- Extender dashboard para mostrar sub-nodos del Signal Hub
- Alertas de violaciones en tiempo real
- Usar la traza para corregir violaciones detectadas
- Optimizar basado en métricas reales del Signal Hub

**Phase 4 (Extensibilidad Futura):**
- Middleware para logging, metrics, filtering
- Signal prioritization y batching
- Consumer permissions y authorization
- Schema evolution y versioning de señales

---

**El Runtime Pipeline no es un nuevo sistema, es la **profundización** que necesitábamos en el Live Cognitive Pipeline existente, potenciado por el Signal Hub para permitir extensibilidad infinita. Ahora sí tendremos visibilidad completa de qué pasa realmente dentro del runtime local, con la claridad conceptual de distinguir entre el Kernel (almacenamiento de verdad) y el Sistema (pipeline vivo de procesamiento), y la capacidad de agregar nuevas señales sin tocar código crítico.**

---

## 🔍 **Nota Fundamental para Refactorización con Signal Hub:**

### **📋 Principio Guía Actualizado:**
**Cuando refactorices, mantén esta distinción clara y usa el Signal Hub:**

- **Kernel = Registro Canónico (almacenamiento y certificación)**
- **Sistema = Pipeline Vivo (procesamiento y flujo)**
- **Señales = Del Sistema (que viajan A TRAVÉS del Kernel)**
- **Signal Hub = Conector Universal (extensibilidad sin cambios críticos)**

### **📋 Evita Ambigüedad (Actualizado):**
```typescript
// ❌ Antiguo: Cambios múltiples en cada lugar
// 1. Modificar WebSocket handler
// 2. Agregar tipo en frontend  
// 3. Modificar schema DB
// 4. Actualizar lógica de routing

// ✅ Nuevo: Solo registro en Signal Hub
signalRegistry.register({
  id: 'runtime.new_signal',
  name: 'New Runtime Signal',
  schema: z.object({ data: z.string() }),
  category: 'runtime',
  consumers: ['websocket', 'monitoring'],
  persistence: 'immediate',
  priority: 'medium'
});

// Y emitir donde sea necesario
await signalBus.emit('runtime.new_signal', { data: 'example' });
```

### **📋 Patrón de Extensión:**
```typescript
// 1. Definir señal en signals/runtime.signals.ts
export const newSignal = {
  id: 'runtime.feature.completed',
  schema: z.object({ featureId: z.string(), result: z.any() }),
  category: 'runtime',
  consumers: ['websocket', 'monitoring', 'analytics'],
  persistence: 'immediate',
  priority: 'medium'
};

// 2. Auto-registro al iniciar
signalRegistry.register(newSignal);

// 3. Emitir en el código
await signalBus.emit('runtime.feature.completed', { 
  featureId: 'abc', 
  result: success 
});

// 4. Consumidores automáticos se configuran solos
// WebSocket, Monitoring, Analytics reciben la señal automáticamente
```

---

*Extensión del Live Cognitive Pipeline para profundizar en la fase Runtime, manteniendo la arquitectura unificada existente, la claridad conceptual entre Kernel (almacenamiento) y Sistema (pipeline), y la capacidad de extensibilidad infinita a través del Signal Hub Architecture.*
