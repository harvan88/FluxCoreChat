# Hito 5: @fluxcore/fluxcore

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06

## Resumen

Implementación de la extensión de IA por defecto `@fluxcore/fluxcore`, que proporciona respuestas inteligentes basadas en el contexto de la relación usando modelos de Groq (LLaMA, Mixtral).

## Componentes Implementados

### Extensión @fluxcore/fluxcore (FC-170, FC-171)

**Ubicación**: `extensions/fluxcore/`

```
extensions/fluxcore/
├── manifest.json       # Definición de la extensión
└── src/
    ├── index.ts        # FluxCoreExtension principal
    ├── prompt-builder.ts # Constructor de prompts contextuales
    └── groq-client.ts  # Cliente para API de Groq
```

### PromptBuilder (FC-172)

Construye prompts contextuales combinando:
- **Perfil público** de la cuenta
- **Contexto privado** de la cuenta
- **Contexto de la relación** (notas, preferencias, reglas)
- **Historial de mensajes** (últimos 10)
- **Overlays** de otras extensiones

### Groq SDK Integration (FC-173)

Cliente para la API de Groq con soporte para:
- `llama-3.1-8b-instant` (default, rápido)
- `llama-3.1-70b-versatile` (más capaz)
- `mixtral-8x7b-32768` (contexto largo)

### Modos de Operación (FC-174)

| Modo | Descripción |
|------|-------------|
| `suggest` | Genera sugerencias que el usuario puede aprobar/editar |
| `auto` | Envía respuestas automáticamente después del delay |
| `off` | Desactivado |

### Cola de Respuestas con Delay (FC-175)

- `responseDelay` configurable (5-300 segundos, default 30)
- Cancela respuestas pendientes si llega nuevo mensaje
- Solo activo en modo `auto`

### Servicio AI (FC-176, FC-177)

**Archivo**: `apps/api/src/services/ai.service.ts`

Funciones:
- Procesar mensajes entrantes
- Generar sugerencias
- Emitir eventos WebSocket `ai:suggestion`
- Gestionar aprobación/rechazo/edición de sugerencias

## API Endpoints

```
GET    /ai/status                    - Estado del servicio
POST   /ai/generate                  - Generar sugerencia manual
GET    /ai/suggestions/:convId       - Sugerencias pendientes
GET    /ai/suggestion/:id            - Obtener sugerencia
POST   /ai/suggestion/:id/approve    - Aprobar sugerencia
POST   /ai/suggestion/:id/reject     - Rechazar sugerencia
POST   /ai/suggestion/:id/edit       - Editar y aprobar
```

## Configuración

### Variables de Entorno

```env
GROQ_API_KEY=gsk_your_api_key_here
```

### Configuración por Cuenta

```json
{
  "enabled": true,
  "mode": "suggest",
  "responseDelay": 30,
  "model": "llama-3.1-8b-instant",
  "maxTokens": 256,
  "temperature": 0.7
}
```

## Estado de Pruebas

### Pruebas Automatizadas

| Suite | Pruebas | Estado |
|-------|---------|--------|
| Chat | 8/8 | ✅ |
| Extensions | 11/11 | ✅ |
| AI Core | 12/12 | ✅ |
| **Total** | **31/31** | ✅ |

### Tests de AI

1. Register User ✅
2. Create Account 1 ✅
3. Create Account 2 ✅
4. Create Relationship ✅
5. Create Conversation ✅
6. Check AI Status ✅
7. Get Pending Suggestions (Empty) ✅
8. Generate Suggestion Request ✅
9. Get Suggestion by ID ✅
10. Approve Suggestion Endpoint ✅
11. Reject Suggestion Endpoint ✅
12. Edit Suggestion Endpoint ✅

## Archivos Creados

### Extensión
- `extensions/fluxcore/manifest.json`
- `extensions/fluxcore/src/index.ts`
- `extensions/fluxcore/src/prompt-builder.ts`
- `extensions/fluxcore/src/groq-client.ts`

### API
- `apps/api/src/services/ai.service.ts`
- `apps/api/src/routes/ai.routes.ts`
- `apps/api/src/test-ai.ts`

### Scripts
- `scripts/run-tests.ts` - Script unificado de pruebas

## Uso

### Generar Sugerencia Manualmente

```bash
curl -X POST http://localhost:3000/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "uuid",
    "accountId": "uuid",
    "message": "Hola, ¿cómo estás?"
  }'
```

### Aprobar Sugerencia

```bash
curl -X POST http://localhost:3000/ai/suggestion/$ID/approve \
  -H "Authorization: Bearer $TOKEN"
```

## Notas Importantes

1. **API Key Required**: Para generación real de respuestas, se necesita `GROQ_API_KEY`
2. **Sin API Key**: Los endpoints funcionan pero retornan `null` en sugerencias
3. **Rate Limits**: Groq tiene límites de tasa, considerar en producción
4. **Contexto**: El PromptBuilder respeta los permisos de la extensión

## Próximos Pasos

1. **Frontend**: Componente `AISuggestionCard` para aprobar/editar
2. **WebSocket**: Integrar eventos `ai:suggestion` en tiempo real
3. **Métricas**: Tracking de aprobaciones/rechazos
4. **Modelos**: Soporte para más providers (OpenAI, Anthropic)

---

**Última actualización**: 2025-12-06
