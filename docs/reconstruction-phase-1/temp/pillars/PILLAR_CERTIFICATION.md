---
id: "pillar-certification"
type: "subsystem"
status: "verified-codigo"
criticality: "high"
location: "apps/api/src/services/fluxcore/cognition-gateway.service.ts"
---

# Pillar: Certification - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Certificación de acciones de IA y resultados del sistema  
**Verificación:** ✅ Basado en código real  
**Archivos analizados:** CognitionGateway y Kernel integration

---

## 🎯 Descubrimiento Fundamental

### **La Certificación está CENTRALIZADA en CognitionGateway:**

#### **Único Punto de Certificación (VERIFICADO):**
- **CognitionGatewayService** - Solo componente que puede certificar acciones IA
- **Kernel Integration** - Usa `kernel.ingestSignal()` directamente
- **Reality Adapter** - Registrado como 'fluxcore-cognition-gateway'

#### **Proceso de Certificación Real:**
1. **Runtime genera respuesta** IA
2. **CognitionGateway recibe** respuesta para certificar
3. **Gateway construye señal** con evidencia completa
4. **Kernel ingesta señal** y asigna sequence number
5. **ChatProjector observa** y entrega a ChatCore
6. **Telemetry emite** eventos de pipeline

---

## 🏗️ Arquitectura de Certificación

### **CognitionGatewayService (VERIFICADO COMPLETO)**

#### **Firma del Servicio:**
```typescript
// apps/api/src/services/fluxcore/cognition-gateway.service.ts
class CognitionGatewayService {
  async certifyAiResponse(params: {
    conversationId: string;
    accountId: string;       // Cuenta que responde (asistente)
    targetAccountId: string; // Cuenta que recibe (usuario)
    content: { text: string };
    turnId: number;
    triggerSignalId?: number; // Para trazabilidad
    runtimeId?: string;
    model?: string;
    provider?: string;
    policyContext?: any;
  }): Promise<{ accepted: boolean; signalId?: number; reason?: string }>
}
```

#### **Configuración del Adapter:**
```typescript
private readonly ADAPTER_ID = 'fluxcore-cognition-gateway';
private readonly ADAPTER_VERSION = '1.0.0';
private readonly DRIVER_ID = 'fluxcore/cognition';
private readonly SIGNING_SECRET = process.env.FLUXCORE_SIGNING_SECRET || 'fluxcore-cognition-dev-secret-local';
```

---

## 🔄 Flujo de Certificación Real (VERIFICADO)

### **Paso 1: Construcción de Evidencia**
```typescript
const evidenceRaw = {
    accountId: params.accountId,
    targetAccountId: params.targetAccountId,
    content: params.content,
    context: {
        conversationId: params.conversationId,
        turnId: params.turnId,
        runtimeId: params.runtimeId || 'unknown',
        model: params.model || 'unknown',
        provider: params.provider || 'unknown',
        triggerSignalId: params.triggerSignalId,
        policyContext: params.policyContext ? {
            accountId: params.policyContext.accountId,
            mode: params.policyContext.mode,
            authorizedTemplates: params.policyContext.authorizedTemplates?.length || 0,
        } : undefined,
    },
    generatedBy: 'ai',
    generatedAt: new Date().toISOString(),
};
```

### **Paso 2: Estructura de Evidencia**
```typescript
const evidence: Evidence = {
    raw: evidenceRaw,
    format: 'json',
    provenance: {
        driverId: this.DRIVER_ID,
        externalId: `ai-response-${params.turnId}-${Date.now()}`,
        entryPoint: 'fluxcore/cognition-worker',
    },
    claimedOccurredAt: new Date().toISOString(),
};
```

### **Paso 3: Construcción de Señal**
```typescript
const candidate: KernelCandidateSignal = {
    factType: 'AI_RESPONSE_GENERATED',
    source: sourceRef,
    subject: sourceRef,
    object: {
        namespace: '@fluxcore/internal',
        key: params.targetAccountId,
    },
    evidence,
    certifiedBy: {
        adapterId: this.ADAPTER_ID,
        adapterVersion: this.ADAPTER_VERSION,
        signature: '',
    },
};
```

### **Paso 4: Firma y Certificación**
```typescript
candidate.certifiedBy.signature = this.signCandidate(candidate);
const seq = await kernel.ingestSignal(candidate);
console.log(`[CognitionGateway] ✅ AI response certified as signal #${seq}`);
```

---

## 🔧 Componentes de Certificación

### **1. Evidence Builder**
- **Datos crudos:** Respuesta IA completa
- **Contexto:** conversationId, turnId, runtimeId
- **Metadata:** model, provider, policyContext
- **Trazabilidad:** triggerSignalId para correlación

### **2. Signal Constructor**
- **Fact Type:** 'AI_RESPONSE_GENERATED'
- **Actor References:** source (asistente), object (usuario)
- **Evidence:** Estructura certificada
- **Certification:** Firma HMAC-SHA256

### **3. Kernel Integration**
- **Direct Call:** `kernel.ingestSignal()`
- **Sequence Number:** ID único y ordenado
- **Transaction:** Atómica y consistente

---

## 📊 Telemetría Integrada (VERIFICADA)

### **Eventos Emitidos:**
```typescript
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

### **Métricas Capturadas:**
- **Message ID:** Correlación con mensaje original
- **Conversation ID:** Seguimiento por conversación
- **Step:** 'certificacion' - fase del pipeline
- **Status:** success/failure
- **Signal IDs:** Nuevo y trigger para trazabilidad

---

## 🚨 Problemas Identificados

### **1. Single Point of Failure**
- **Solo CognitionGateway** puede certificar
- **Si falla gateway** - Ninguna respuesta IA se certifica
- **No hay backup** ni mecanismo de fallback

### **2. Acoplamiento Fuerte**
- **Runtimes dependen** directamente de gateway
- **No hay abstracción** sobre certificación
- **Difícil de testear** sin kernel real

### **3. Configuración Hardcodeada**
- **Adapter ID** y **version** fijos
- **Signing secret** desde environment
- **No hay configuración** dinámica

---

## 📊 Estado Actual de Certificación

### **✅ FUNCIONAL:**
- [x] CognitionGatewayService implementado
- [x] Kernel integration funcionando
- [x] Telemetry básica funcionando
- [x] Firma y validación funcionando

### **❌ PROBLEMAS:**
- [ ] Single point of failure
- [ ] Acoplamiento fuerte con kernel
- [ ] Configuración estática
- [ ] Sin mecanismos de retry

---

## 🔗 Referencias Cruzadas

- **Cognition Gateway:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- **Kernel:** `apps/api/src/core/kernel.ts`
- **Types:** `apps/api/src/core/types.ts`
- **Events:** `apps/api/src/core/events.ts`
- **Projectors:** `apps/api/src/projectors/chat-projector.ts`

---

## ❓ Preguntas Abiertas

### **Para el Usuario:**
1. **¿Quieres múltiples puntos de certificación?**
2. **Cómo manejar fallback si gateway falla?**
3. **Qué telemetría adicional necesitas?**
4. **Cómo configurar dinámicamente los adapters?**

### **Técnicas:**
1. **Cómo abstract certificación?**
2. **Qué mecanismos de retry implementar?**
3. **Cómo testear sin kernel?**
4. **Cómo escalar certificación?**

---

## 🚀 Próximos Pasos

### **Inmediato:**
1. **Implementar retry mechanism**
2. **Agregar fallback options**
3. **Mejorar telemetry**
4. **Configuración dinámica**

### **Mediano Plazo:**
1. **Abstract certification layer**
2. **Multiple certification points**
3. **Circuit breaker pattern**
4. **Health checks**

---

## 🎯 Impacto en la Arquitectura

### **Conexión con el Kernel:**
- **CognitionGateway es Reality Adapter** registrado
- **Certifica acciones IA** como hechos físicos
- **Permite reconstrucción** del estado desde el journal

### **Comunicación entre Mundos:**
- **FluxCore certifica** en Kernel
- **ChatCore observa** vía projectors
- **Soberanía mantenida** por mediación del Kernel

### **Garantías del Sistema:**
- **Exact-once delivery** via sequence numbers
- **Orden total** de todas las acciones
- **Inmutabilidad** del journal certificado
