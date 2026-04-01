---
id: "template-parsing-problem"
type: "issue"
status: "critical"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-04-01", confidence: 100, notes: "Detectado en pruebas de floristería" }
  connections: { status: "complete", completed_date: "2026-04-01", confidence: 100, notes: "Afecta a prompt-builder y runtime local" }
  subsystem: { status: "needs_analysis", completed_date: "2026-04-01", confidence: 100, notes: "Parseo de CALL_TEMPLATE mezclado con texto" }
  operations: { status: "needs_fix", completed_date: "2026-04-01", confidence: 100, notes: "Separación de marcadores del texto conversacional" }
evolution: { current_layer: 2, total_layers: 4, completion_percentage: 50 }
---

# 🚨 Problema Crítico: Parseo de Plantillas Mezcladas con Texto

## 🎯 Descripción del Problema

**Fecha de detección:** 2026-04-01  
**Impacto:** Crítico - Produce mensajes malformados en ChatCore

Cuando el LLM genera respuestas que mezclan marcadores `CALL_TEMPLATE:<uuid>` con texto conversacional, el runtime `asistentes-local` no logra separarlos correctamente. Esto resulta en mensajes ilegibles que llegan al usuario final.

## 🔍 Evidencia del Problema

### Test case: Floristería
```json
{
  "user": "Estoy intersado en orquiedeas blancas, me podr{ias decir cuanto cuestan y si puedo hacer la transferencia??",
  "expected": [
    {
      "type": "send_template",
      "templateId": "c72413c0-2448-4c32-9f93-142452705441"
    },
    {
      "type": "send_message",
      "content": "Respuesta sobre precios de orquídeas blancas"
    }
  ],
  "actual": "Mensaje malformado con marcadores incrustados"
}
```

### Comportamiento observado:
1. El LLM genera un marcador `CALL_TEMPLATE:` en medio del texto conversacional
2. `parseTemplateResponse()` no logra extraerlo correctamente
3. El mensaje resultante contiene tanto el marcador como el texto mezclados
4. ChatCore recibe un output malformado

## 🏗️ Arquitectura Afectada

### Componentes involucrados:
1. **`prompt-builder.service.ts`** - Instruye el uso de `CALL_TEMPLATE:`
2. **`asistentes-local.runtime.ts`** - Parsea la respuesta del LLM
3. **`parseTemplateResponse()`** - Función que extrae marcadores
4. **`generateTemplateAwareFollowUp()`** - Intenta generar seguimiento

### Flujo actual problemático:
```
LLM Output → parseTemplateResponse() → Malformado → ChatCore
```

## 🧩 Root Cause Analysis

### Causa principal:
El cambio reciente para usar `CALL_TEMPLATE:` en lugar del tool `send_template` introdujo un protocolo más simple pero menos robusto. El LLM ahora puede generar marcadores en cualquier posición del texto, no solo al final.

### Factores contribuyentes:
1. **Instrucciones ambiguas** en `prompt-builder.service.ts`
2. **Parseo limitado** que espera marcadores aislados
3. **Falta de validación** post-parseo
4. **No hay separación clara** entre plantillas y texto conversacional

## 🛠️ Solución Propuesta

### Opción 1: Interceptar y parsear estructurado
```typescript
interface ParsedLLMOutput {
  templates: Array<{ id: string; variables?: Record<string, string> }>;
  text: string | null;
}

// Antes de enviar a ChatCore
const parsed = parseLLMOutput(rawLLMResponse);
if (parsed.templates.length > 0) {
  // Enviar templates primero
  await dispatchTemplates(parsed.templates);
  if (parsed.text) {
    await sendMessage(parsed.text);
  }
}
```

### Opción 2: Mejorar instrucciones al LLM
Actualizar `prompt-builder.service.ts` para instruir explícitamente:
- Los marcadores `CALL_TEMPLATE:` deben ir al final
- O usar un formato JSON estructurado
- Separar claramente plantillas de texto

### Opción 3: Protocolo híbrido
Mantener `CALL_TEMPLATE:` para compatibilidad pero agregar soporte para:
- `CALL_TEMPLATE:` al inicio o final
- JSON estructurado cuando hay múltiples plantillas
- Validación post-parseo

## 📋 Próximos Pasos

1. **Análisis profundo** del código de parseo actual
2. **Diseño** de solución robusta
3. **Implementación** con tests unitarios
4. **Pruebas de integración** con casos reales
5. **Deploy** con monitoreo

## 🔒 Consideraciones de Seguridad

- Validar IDs de plantillas contra lista autorizada
- Sanitizar variables antes de procesar
- Evitar inyección de plantillas maliciosas

## 📊 Métricas de Impacto

- **Usuarios afectados:** Todos los que usan plantillas
- **Frecuencia:** Alta cuando hay preguntas complejas
- **Severidad:** Crítica (experiencia de usuario rota)

## 🏷️ Tags

`critical`, `templates`, `parsing`, `llm-output`, `chatcore`, `runtime-local`
