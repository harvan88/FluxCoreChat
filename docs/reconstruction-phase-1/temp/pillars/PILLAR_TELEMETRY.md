---
id: "pillar-telemetry"
type: "subsystem"
status: "verified-codigo"
criticality: "medium"
location: "apps/api/src/core/events.ts y telemetry.service.ts"
---

# Pillar: Telemetry - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Sistema de telemetría y monitoreo del pipeline cognitivo  
**Verificación:** ✅ Basado en código real  
**Archivos analizados:** Core events y telemetry service

---

## 🎯 Descubrimiento Fundamental

### **La Telemetría está IMPLEMENTADA y CENTRALIZADA:**

#### **Core Event Bus (VERIFICADO):**
- **CoreEventBus** - Sistema central de eventos singleton
- **20+ tipos de eventos** definidos en interface
- **Telemetría específica** para pipeline visual

#### **Eventos de Pipeline (VERIFICADOS):**
- **'telemetry:pipeline_step'** - Seguimiento de pasos
- **Nodos:** ingreso → proyección → worker → dispatcher → runtime → certificación → entrega
- **Estados:** pending | processing | success | error

---

## 🏗️ Arquitectura de Telemetría

### **CoreEventBus (VERIFICADO COMPLETO)**

#### **Definición de Eventos:**
```typescript
// apps/api/src/core/events.ts
export interface CoreEventMap {
    // Core message events
    'core:message_received': (payload: { envelope: MessageEnvelope; result: ReceiveResult }) => void;
    'core:message_updated': (payload: { messageId: string; conversationId: string; accountId: string; senderAccountId: string; oldContent: any; newContent: any; transcription?: string }) => void;
    
    // Media and asset events
    'media:enriched': (payload: { messageId: string; accountId: string; type: string; enrichment: any }) => void;
    'asset:ready': (payload: { assetId: string; accountId: string; mimeType?: string | null; sizeBytes?: number | null; checksum?: string | null; metadata?: Record<string, unknown> | null }) => void;
    'asset:linked': (payload: { assetId: string; messageId: string; accountId: string }) => void;
    'asset:transcription_completed': (payload: { assetId: string; accountId: string; transcription: string; language?: string; model: string; processedAt: Date }) => void;
    'asset:enrichment_failed': (payload: { assetId: string; reason: string; metadata?: Record<string, unknown> | null }) => void;
    
    // Kernel events
    'kernel:wakeup': () => void;
    'kernel:cognition:wakeup': (payload: { conversationId: string; accountId: string }) => void;
    
    // Projector events
    'identity:resolved': (payload: { sequenceNumber: number; actorId: string; contextId: string }) => void;
    
    // Cognition pipeline events
    'cognition:turn_processed': (payload: { conversationId: string; accountId: string; runtimeUsed: string; actionCount: number }) => void;
    'cognition:turn_failed': (payload: { conversationId: string; accountId: string; error: string; attempt: number }) => void;
    
    // Policy and authorization events
    'account.profile.updated': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'template.authorization.changed': (payload: { templateId: string; accountId: string; allowAutomatedUse: boolean }) => void;
    'relationship.context.updated': (payload: { relationshipId: string; accountId?: string }) => void;
    'knowledge.authorized': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'appointments.authorization.changed': (payload: { accountId: string }) => void;
    
    // Assistant configuration events
    'assistant.config.updated': (payload: { accountId: string; assistantId: string; change: 'activated' | 'updated' }) => void;
    'policy.config.updated': (payload: { accountId: string }) => void;
    
    // Telemetry events
    'telemetry:pipeline_step': (payload: PipelineTelemetryEvent) => void;
}
```

#### **Implementación del Bus:**
```typescript
export class CoreEventBus extends EventEmitter {
    constructor() {
        super();
        console.log('🔌 CoreEventBus initialized (Singleton Check)');
    }
    
    emit<K extends keyof CoreEventMap>(event: K, ...args: Parameters<CoreEventMap[K]>): boolean {
        return super.emit(event, ...args);
    }
    
    on<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.on(event, listener);
    }
}

export const coreEventBus = new CoreEventBus();
```

### **TelemetryService (VERIFICADO COMPLETO)**

#### **Tipos de Telemetría:**
```typescript
// apps/api/src/core/telemetry/telemetry.service.ts
export type PipelineNodeStep = 'ingreso' | 'proyeccion' | 'worker' | 'dispatcher' | 'runtime' | 'certificacion' | 'entrega';

export interface PipelineTelemetryEvent {
  messageId: string;               
  conversationId: string;          
  step: PipelineNodeStep;          
  status: 'pending' | 'processing' | 'success' | 'error';
  metadata?: {
    runtimeId?: string;            
    model?: string;
    errorDetail?: string;
    latencyMs?: number;
    newSignalId?: number;
    triggerSignalId?: number;
  };
  timestamp: string;
}
```

#### **Función de Emisión:**
```typescript
export function emitTelemetry(
  messageId: string,
  conversationId: string,
  step: PipelineNodeStep,
  status: 'pending' | 'processing' | 'success' | 'error',
  metadata?: PipelineTelemetryEvent['metadata']
) {
  try {
    const payload: PipelineTelemetryEvent = {
      messageId,
      conversationId,
      step,
      status,
      timestamp: new Date().toISOString(),
      metadata,
    };
    // Safe emission that won't break the main pipeline
    coreEventBus.emit('telemetry:pipeline_step', payload);
  } catch (error) {
    console.error('[Telemetría] Error silencioso enviando telemetría:', error);
  }
}
```

---

## 🔄 Flujo de Telemetría Real (VERIFICADO)

### **Paso 1: Eventos de Kernel**
```typescript
// En kernel.ts después de ingestSignal
coreEventBus.emit('kernel:wakeup', { 
    source: 'kernel.ingestSignal',
    timestamp: Date.now() 
});
```

### **Paso 2: Telemetría de Pipeline**
```typescript
// En cognition-gateway.service.ts
coreEventBus.emit('telemetry:pipeline_step', {
    messageId: String(params.triggerSignalId || seq),
    conversationId: params.conversationId,
    step: 'certificacion',
    status: 'success',
    metadata: { 
        newSignalId: seq,
        triggerSignalId: params.triggerSignalId 
    },
    timestamp: new Date().toISOString()
});
```

### **Paso 3: Eventos de Autorización**
```typescript
// En template.service.ts
coreEventBus.emit('template.authorization.changed', {
    templateId,
    accountId,
    allowAutomatedUse: updated.allowAutomatedUse,
});
```

---

## 🔧 Componentes de Telemetría

### **1. Pipeline Visual**
- **7 nodos definidos** del pipeline cognitivo
- **4 estados** para seguimiento
- **Metadata enriquecida** con runtime, model, latency

### **2. Eventos de Negocio**
- **Autorizaciones** - templates, knowledge, appointments
- **Configuraciones** - assistants, policies
- **Media processing** - transcription, enrichment

### **3. Kernel Integration**
- **Wake up events** - Cuando kernel recibe señales
- **Cognition triggers** - Para iniciar procesamiento
- **Projector events** - Para seguimiento de proyecciones

---

## 📊 Eventos por Categoría (VERIFICADOS)

### **Core Messages (3 eventos):**
- `core:message_received` - Mensaje persistido
- `core:message_updated` - Mensaje actualizado (transcripción)
- `media:enriched` - Media procesada

### **Assets (5 eventos):**
- `asset:ready` - Asset listo
- `asset:linked` - Asset vinculado a mensaje
- `asset:transcription_completed` - Transcripción completada
- `asset:enrichment_failed` - Falló enriquecimiento

### **Kernel (2 eventos):**
- `kernel:wakeup` - Kernel despertado
- `kernel:cognition:wakeup` - Cognition iniciado

### **Cognition (2 eventos):**
- `cognition:turn_processed` - Turno procesado
- `cognition:turn_failed` - Turno falló

### **Authorization (6 eventos):**
- `account.profile.updated` - Perfil actualizado
- `template.authorization.changed` - Autorización template
- `relationship.context.updated` - Contexto relación
- `knowledge.authorized` - Conocimiento autorizado
- `appointments.authorization.changed` - Citas autorización
- `assistant.config.updated` - Config asistente

### **Policy (1 evento):**
- `policy.config.updated` - Config política actualizada

### **Telemetry (1 evento):**
- `telemetry:pipeline_step` - Paso del pipeline

---

## 🚨 Problemas Identificados

### **1. Telemetría Parcial**
- **Solo algunos componentes** emiten eventos
- **No hay cobertura completa** del pipeline
- **Eventos faltantes** en varios pasos

### **2. Sin Persistencia**
- **Eventos solo en memoria** - no se guardan
- **No hay histórico** de telemetría
- **Sin análisis** post-mortem

### **3. Error Handling Débil**
- **Safe emission** pero sin retry
- **Error silencioso** puede perder datos
- **No hay métricas** de pérdida de eventos

---

## 📊 Estado Actual de Telemetría

### **✅ FUNCIONAL:**
- [x] CoreEventBus implementado
- [x] 20+ tipos de eventos definidos
- [x] Pipeline telemetry funcionando
- [x] Safe emission implementado

### **❌ PROBLEMAS:**
- [ ] Cobertura incompleta del pipeline
- [ ] Sin persistencia de eventos
- [ ] Sin dashboard o visualización
- [ ] Error handling básico

---

## 🔗 Referencias Cruzadas

- **Core Events:** `apps/api/src/core/events.ts`
- **Telemetry Service:** `apps/api/src/core/telemetry/telemetry.service.ts`
- **Kernel:** `apps/api/src/core/kernel.ts`
- **Cognition Gateway:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- **Template Service:** `apps/api/src/services/template.service.ts`

---

## ❓ Preguntas Abiertas

### **Para el Usuario:**
1. **¿Quieres persistencia de eventos?**
2. **Qué dashboard de telemetría necesitas?**
3. **Cómo mejorar la cobertura del pipeline?**
4. **Qué métricas adicionales te interesan?**

### **Técnicas:**
1. **Cómo almacenar eventos eficientemente?**
2. **Qué herramienta de visualización usar?**
3. **Cómo implementar retry en eventos?**
4. **Cómo agregar alerting?**

---

## 🚀 Próximos Pasos

### **Inmediato:**
1. **Mapear cobertura actual** del pipeline
2. **Identificar eventos faltantes**
3. **Implementar persistencia** básica
4. **Crear dashboard simple**

### **Mediano Plazo:**
1. **Completar cobertura** del pipeline
2. **Implementar alerting**
3. **Agregar análisis** de rendimiento
4. **Crear métricas** de negocio
<tool_call>find_by_name
<arg_key>SearchDirectory</arg_key>
<arg_value>c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api\src\core
