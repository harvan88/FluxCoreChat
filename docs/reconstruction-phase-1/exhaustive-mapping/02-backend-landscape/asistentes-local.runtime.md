---
id: "asistentes-local-runtime"
type: "cognitive-runtime"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LLM Client, RAG Context, Template Registry, Prompt Builder" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Cognitivo Soberano (Local LLM)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Multi-round Tool Calling, RAG Injection, Template Authorization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AsistentesLocalRuntime (v8.3)

## 🎯 Propósito
Es el motor de IA por defecto de FluxCore. A diferencia de OpenAI, este runtime utiliza modelos Open Source (vía Groq o proveedores locales) para procesar mensajes. Implementa la soberanía cognitiva asegurando que la lógica de negocio y los datos no salgan del ecosistema controlado si así se configura.

## 🛠️ Capacidades (Tools)
1. **`search_knowledge`**: Implementa RAG (Retrieval Augmented Generation). Consulta la base de conocimientos propia del negocio para inyectar hechos reales en la respuesta de la IA.
2. **`send_template`**: Permite a la IA decidir enviar una plantilla oficial en lugar de redactar un texto libre, garantizando cumplimiento normativo.

## 🔄 Ciclo de Ejecución
- **Bucle de Herramientas:** Soporta hasta 2 rondas de llamadas a herramientas (`MAX_TOOL_ROUNDS`). La IA puede decidir buscar información, analizarla y luego responder.
- **Invariante de Seguridad:** No tiene acceso directo a la Base de Datos. Todo el contexto llega inyectado en el `RuntimeInput`.
- **Prevalencia de Políticas:** Las reglas definidas en el `PolicyContext` (Tono, Idioma, Emojis) tienen prioridad absoluta sobre el prompt del sistema.

## ⚡ Performance y Resiliencia
- **LLM Client Integration:** Utiliza `llmClient` para manejar reintentos y fallbacks automáticos entre modelos si el proveedor principal falla.
- **RAG Fetch:** Realiza llamadas internas HTTP al gateway de RAG para mantener el aislamiento de procesos.

## 💡 Innovación v8.3
Introduce la autorización granular de plantillas: la IA solo puede enviar lo que el humano ha marcado como "Autorizado para IA" en el Registry.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
