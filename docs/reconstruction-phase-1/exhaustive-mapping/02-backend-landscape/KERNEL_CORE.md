---
id: "kernel-core"
type: "core"
status: "needs_review"
criticality: "high"
location: "apps/api/src/core/kernel.ts"
---

# Kernel Core - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Certificador Soberano de Realidad - Unión de los mundos ChatCore y FluxCore  
**Verificación:** ✅ Basado en código real (378 líneas)  
**Arquitectura:** Componente central que certifica acciones de ambos mundos

---

## 🎯 Propósito

El Kernel es la **unión de los mundos** y el **registro certificado por los mundos**. Tanto ChatCore como FluxCore certifican acciones importantes en el Kernel, que funciona como un notario entre ellos, garantizando la soberanía de ambas partes.

### Lo que SÍ hace:
- ✅ **Servir como registro certificado** donde ChatCore y FluxCore registran acciones
- ✅ **Funcionar como punto de conexión** entre mundos soberanos
- ✅ **Actuar como notario** que certifica interacciones entre mundos
- ✅ **Despertar/estimular** a los mundos para que procesen y respondan
- ✅ **Garantizar soberanía** de ChatCore y FluxCore mediante comunicación mediada

### Lo que NO hace:
- ❌ **No pertenece a un solo mundo** - Es neutral entre ChatCore y FluxCore
- ❌ **No interpreta contenido** - Solo certifica que algo ocurrió
- ❌ **No toma decisiones de negocio** - Eso lo hacen cada mundo por separado
- ❌ **No es dueño de la realidad** - Es solo el certificador

---

## 🏗️ Arquitectura

### Flujo de Comunicación Real:
```
ChatCore (soberano)
  └── Certifica acción en Kernel
      └── Kernel como notario
          └── Despierta a FluxCore
              └── FluxCore procesa
                  └── Certifica respuesta en Kernel
                      └── Despierta a ChatCore
                          └── ChatCore entrega al usuario
```

### Método Principal: ingestSignal()
```typescript
async ingestSignal(candidate: KernelCandidateSignal): Promise<number> {
    // Validación de fact type
    if (!PHYSICAL_FACT_TYPES.has(candidate.factType)) {
        throw new Error(`Unknown physical fact class: ${candidate.factType}`);
    }
    
    // Validación de adapter
    const adapterAllowed = await db.query.fluxcoreRealityAdapters.findFirst({
        where: (t, { eq }) => eq(t.adapterId, candidate.certifiedBy.adapterId),
    });
    
    // Firma y procesamiento
    // ... (continúa en archivo)
}
```

---

## 📊 Tipos de Hechos Físicos (VERIFICADOS)

### 6 Fact Types Físicos del Kernel:
```typescript
// apps/api/src/core/kernel.ts
const PHYSICAL_FACT_TYPES: ReadonlySet<PhysicalFactType> = new Set([
  'EXTERNAL_INPUT_OBSERVED',    // Usuario envió mensaje
  'EXTERNAL_STATE_OBSERVED',    // Cambios de estado (typing, idle)
  'DELIVERY_SIGNAL_OBSERVED',   // Señales de entrega
  'MEDIA_CAPTURED',             // Media capturado (audio, imagen)
  'SYSTEM_TIMER_ELAPSED',       // Timer del sistema
  'CONNECTION_EVENT_OBSERVED',  // Eventos de conexión
]);
```

### 🚨 DUDA TÉCNICA IMPORTANTE:
**¿Existen más fact types en el código que no están en esta lista?**
- **Ubicación:** `apps/api/src/core/kernel.ts` línea 271-278
- **Impacto:** Si existen otros fact types, el kernel podría estar procesando señales no documentadas
- **Acción requerida:** Revisión completa de `fluxcore_signals` table y todos losReality Adapters

---

## 🔧 Dependencias

### De quién depende:
- **Database:** `fluxcore_signals`, `fluxcore_reality_adapters`, `fluxcore_outbox`
- **Crypto:** Para firma y verificación de señales
- **Event Bus:** Para emitir eventos de wakeup

### Quién depende de él:
- **ChatCoreGateway:** Para certificar mensajes de usuarios
- **CognitionGateway:** Para certificar respuestas de IA
- **Projectors:** Para consumir señales certificadas
- **Runtimes:** Para ser despertados por eventos del kernel

---

## 🚨 Problemas Identificados

### Single Point of Failure:
- **Solo un kernel** certifica toda la realidad
- **Si falla** - Ninguna comunicación entre mundos
- **No hay fallback** ni mecanismo de recuperación

### Configuración Estática:
- **Adapter IDs fijos** sin configuración dinámica
- **Signing secrets** desde environment variables
- **Sin discovery** automático de adapters

---

## 🔗 Referencias Cruzadas

- **Código:** `apps/api/src/core/kernel.ts` (378 líneas)
- **Tipos:** `apps/api/src/core/types.ts`
- **Eventos:** `apps/api/src/core/events.ts`
- **Schema:** `packages/db/src/schema/fluxcore-signals.ts`

---

## 🚨 Dudas Técnicas Adicionales

### 🔍 DUDA 2: Validación de Adapters
**Pregunta:** ¿Cómo se registran nuevos Reality Adapters?
**Riesgo:** Sistema podría estar aceptando adapters no autorizados
**Investigación requerida:** Revisar mecanismo de registro de adapters

### 🔍 DUDA 3: Manejo de Errores
**Pregunta:** ¿Qué pasa si kernel.ingestSignal() falla?
**Riesgo:** Pérdida de datos o inconsistencias
**Investigación requerida:** Revisar error handling y retry mechanisms
