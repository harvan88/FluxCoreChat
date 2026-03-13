# WES-170: Integración Cognitiva (AI Interpreter)

## Resumen de Implementación
Se ha implementado el **WES Interpreter Service** para desacoplar el chat conversacional de la detección de intenciones transaccionales.

### Componentes Clave
1. **`WesInterpreterService`** (`apps/api/src/services/wes-interpreter.service.ts`):
   - Servicio sin estado que actúa como "Router Cognitivo".
   - Consume `WorkDefinitions` activas de la cuenta.
   - Construye un prompt especializado para detectar `intent` y extraer `candidateSlots` con `evidence`.
   - Utiliza llamadas directas al LLM (evitando el pipeline de chat para reducir latencia y alucinaciones).
   - Retorna una estructura `ProposedWorkAnalysis` o `null`.

2. **Integración en `AIOrchestrator`**:
   - Se intercepta el flujo de `generateAIResponse`.
   - Antes de generar una respuesta de chat, se invoca a `interpreter.interpret()`.
   - Si se detecta una intención transaccional válida (con binding attribute):
     a. Se persiste el `DecisionEvent` y `ProposedWork` (cumpliendo WES-100/150).
     b. Se abre automáticamente el Work (cumpliendo la promesa de "Zero-Click" si la evidencia es suficiente).
     c. Se responde al usuario con un mensaje de sistema ("Entendido. Iniciando trabajo...").
     d. Se detiene la generación de chat genérico.

### Flujo de Datos
`User Message` -> `AIOrchestrator` -> `WesInterpreterService`
   -> (1) `WorkDefinitionService.listLatest` (Schema)
   -> (2) `LLM` (Analysis)
   -> `ProposedWorkAnalysis` (JSON)

Si Match:
   -> `WorkEngineService.proposeWork` (Persistencia)
   -> `WorkEngineService.openWork` (Ejecución)
   -> `MessageCore.send` (Confirmación)

Si No Match:
   -> `ExtensionHost.generateAIResponse` (Chat Genérico / RAG)

### Invariantes Cumplidas
- **Determinismo Operativo:** El WES no "adivina". El Interpreter propone JSON estructurado con evidencia textual. Si no hay evidencia textual para el `bindingAttribute`, no propone nada.
- **Separación de Poderes:** La IA (Interpreter) solo propone. El `WorkEngine` valida y persiste.
- **Auditoría:** Cada decisión del Interpreter se guarda como `DecisionEvent` vinculado al `ProposedWork`.
- **Latencia:** El Interpreter falla rápido (fail-fast) si no hay definiciones, y usa un prompt optimizado.

## Próximos Pasos (Hardening)
- Implementar caché de definiciones en `WesInterpreterService` para no consultar DB en cada mensaje.
- Configurar modelo específico para Interpreter (actualmente hardcoded a `groq/llama-3.1-70b-versatile` por performance/costo).
- Manejar casos de ambigüedad (cuando el Interpreter devuelve `match: true` pero múltiples candidatos) -> actualmente `ask_user` no está implementado en Interpreter, solo retorna `null` y cae al chat.
