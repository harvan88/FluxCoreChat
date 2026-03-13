# Estrategia de Testing FluxCore AI

## 🎯 Objetivo
Reducir costos de testing y evitar consumo de créditos innecesarios.

## 🛡️ Protecciones Implementadas

### 1. Filtro de Canales
```typescript
// MessageDispatch NO procesa AI para:
- channel === 'internal'  // Conversaciones de desarrollo/debug
- channel === 'test'       // Conversaciones de testing
```

### 2. Filtro de Self-Conversations
```typescript
// MessageDispatch NO procesa AI si:
- sender === target (conversación consigo mismo)
```

### 3. CognitionWorker - Modo Idle
```typescript
// Polling adaptativo:
- Activo: 1s (cuando hay trabajo)
- Idle: 5s (después de 5 polls vacíos)
// Reduce polling innecesario en ~80%
```

## 📋 Conversaciones de Testing

### Conversaciones Identificadas

| Conversación | Participantes | Canal | Estado | Acción |
|--------------|---------------|-------|--------|--------|
| `1d568459` | Harold ↔ Harold | internal | ⚠️ Self-conv | **PROTEGIDO** - AI deshabilitado |
| `171a80d7` | Harold ↔ Daniel | web | ✓ Normal | Testing permitido |
| Harold ↔ Casa de Papel | Harold ↔ ? | web | ✓ Normal | Testing permitido |
| Harold ↔ Patricia | Harold ↔ ? | web | ✓ Normal | Testing permitido |

### Cuenta Daniel
- **ID**: `a9611c11-...`
- **Username**: `daniel_mkonr9z2`
- **Display Name**: Daniel Test
- **Política**: Verificar si tiene mode='auto' (puede causar respuestas no deseadas)

## 🔧 Testing con Logs Condicionales

### Variable de Entorno
```bash
# .env
DEBUG_AI_FLOW=true  # Habilitar logs detallados
```

### Logs Críticos (Siempre Activos)
```typescript
[MessageDispatch] 🎬 handleMessageReceived
[MessageDispatch] ⏭️  SKIP AI: channel=...
[MessageDispatch] ⏭️  SKIP AI: Self-conversation
[CognitiveDispatcher] 🎯 DISPATCH START
[ActionExecutor] 💬 Message sent / 🔇 No action
```

### Logs de Debug (Condicionales)
```typescript
if (process.env.DEBUG_AI_FLOW === 'true') {
  console.log('[DEBUG] Historial completo:', history);
  console.log('[DEBUG] RAG context:', ragContext);
}
```

## ✅ Checklist Pre-Test

Antes de enviar mensaje de prueba:

1. [ ] ¿Es conversación real (web/whatsapp)?
2. [ ] ¿Participantes diferentes (no self-conversation)?
3. [ ] ¿Política mode='auto' correcta?
4. [ ] ¿Asistente activo configurado?
5. [ ] ¿Logs críticos habilitados?

## 🚫 NO Testing

### Canales Excluidos
- ❌ `internal` - Solo desarrollo
- ❌ `test` - Solo pruebas automatizadas

### Conversaciones Excluidas
- ❌ Self-conversations (Harold > Harold)
- ❌ Conversaciones sin relationship válido

## 💰 Costos Estimados

### Por Mensaje (Groq/llama-3.1-8b-instant)
- Input: ~$0.0001 / mensaje
- Output: ~$0.0002 / respuesta
- **Total: ~$0.0003 / interacción**

### Por Debug Session
- Sin protecciones: ~50 mensajes = **$0.015**
- Con protecciones: ~5-10 mensajes = **$0.002-0.003**
- **Ahorro: ~80-85%**

## 📊 Monitoreo

### Script de Verificación
```bash
bun run scripts/verify-ai-response.ts
```

### Queries Útiles
```sql
-- Ver última actividad AI
SELECT conversation_id, processed_at, last_error
FROM fluxcore_cognition_queue
WHERE processed_at IS NOT NULL
ORDER BY processed_at DESC
LIMIT 10;

-- Mensajes AI recientes
SELECT conversation_id, content->>'text', created_at
FROM messages
WHERE generated_by = 'ai'
ORDER BY created_at DESC
LIMIT 10;
```

## 🎓 Lecciones Aprendidas

1. **Logs críticos primero** - Los logs en puntos clave revelaron el bug en 1 intento vs. 20+ scripts
2. **Proteger canales** - internal/test NO deben consumir créditos
3. **Idle mode** - Polling constante desperdicia recursos
4. **Self-conversations** - Detectar y bloquear temprano
5. **Role assignment** - Validar lógica de role antes de runtime

## 📝 Próximos Pasos

- [ ] Implementar flag DEBUG_AI_FLOW
- [ ] Crear script de limpieza de conversaciones de prueba
- [ ] Agregar métricas de consumo de créditos
- [ ] Dashboard de testing con costos en tiempo real
