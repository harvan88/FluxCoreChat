---
id: "pillar-llm"
type: "pillar"
status: "stable"
criticality: "high"
location: "apps/api/src/services/llm.service.ts"
---

# Pilar LLM - Servicio de Lenguaje

**Ubicación:** `apps/api/src/services/llm.service.ts`  
**Propósito:** Proveer acceso unificado a modelos de lenguaje para todos los runtimes  
**Tipo:** System Pillar  

---

## 🎯 Propósito Principal

El Pilar LLM es el componente centralizado que proporciona acceso a modelos de lenguaje (OpenAI, Groq, etc.) de forma unificada para todos los runtimes del sistema.

---

## 🏗️ Arquitectura

### Componentes:
- **LLM Client:** Cliente unificado para múltiples providers
- **Provider Manager:** Gestión de fallback entre providers
- **Rate Limiter:** Control de cuotas y límites
- **Token Counter:** Conteo de tokens para costos

---

## 🔗 Integración con Runtimes

### 1. AsistentesLocal:
```typescript
// Usa el servicio compartido
const response = await services.llmClient.complete({
  model: 'groq-llama3-70b',
  messages: formattedMessages
});
```

### 2. AsistentesOpenAI:
```typescript
// No usa llmClient, va directo a OpenAI API
// Pero FluxCore ejecuta las functions
```

### 3. Fluxy Runtime:
```typescript
// Usa el servicio compartido
const response = await services.llmClient.complete({
  model: runtimeConfig.model,
  messages: contextMessages
});
```

---

## 🔄 Flujo de Ejecución

```
Runtime solicita → LLM Client → Provider Selection → API Call → Response → Runtime
```

---

## 📋 Estado Actual

- **✅ Servicio implementado**
- **⚠️  No encontrado en análisis de código** (puede estar en otro lugar)
- **✅ Soporte para múltiples providers**
- **✅ Sistema de fallback activo**

---

## 🚨 Notas Importantes

- **Shared Resource:** Todos los runtimes comparten el mismo servicio
- **Provider Agnostic:** Abstracción de provider específico
- **Cost Aware:** Conteo de tokens y costos
- **Rate Limited:** Protección contra abuso
