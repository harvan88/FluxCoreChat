# 🧠 Reporte de Soberanía Cognitiva
- **Mensaje**: "Prueba final duplicacion"

## Trace
- **ingreso**: success
- **proyeccion**: success
- **proyeccion**: success
- **worker**: processing
- **runtime**: success
- **certificacion**: success
- **dispatcher**: success
- **worker**: success
- **entrega**: success
- **entrega**: success

## Fases
### 📍 IA_RUNTIME_INVOCATION
```json
[
  {
    "type": "send_message",
    "conversationId": "03b4d3e3-588d-4b21-b62d-17ca21c8e641",
    "content": "Parece que has terminado con las pruebas. ¡Genial! Estoy aquí para ayudarte si necesitas algo. ¿Qué puedo hacer por ti hoy?"
  }
]
```

### 📍 FASE_0_SIEVE
```json
[]
```

### 📍 FASE_1_ROUTER
```json
{
  "matchedTemplateIds": [
    "0000"
  ],
  "extractedIntent": "duplicacion"
}
```

### 📍 FASE_3_RESOLUTIVE_CALL
```json
{
  "content": "Parece que has terminado con las pruebas. ¡Genial! Estoy aquí para ayudarte si necesitas algo. ¿Qué puedo hacer por ti hoy?",
  "finishReason": "stop",
  "model": "llama-3.1-8b-instant",
  "provider": "groq",
  "usage": {
    "promptTokens": 730,
    "completionTokens": 36,
    "totalTokens": 766
  }
}
```

### 📍 FASE_4_BODY_TRANSLATION
```json
[
  {
    "type": "send_message",
    "conversationId": "03b4d3e3-588d-4b21-b62d-17ca21c8e641",
    "content": "Parece que has terminado con las pruebas. ¡Genial! Estoy aquí para ayudarte si necesitas algo. ¿Qué puedo hacer por ti hoy?"
  }
]
```

