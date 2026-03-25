---
id: "runtime-gateway"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/runtime-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Recuperado" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RuntimeAdapters (Abstracciones)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Registro Agnóstico de Proveedores" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Registro En Memoria, Límites de Timeout, Capturas Blindadas" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# Runtime Gateway – El Registro de Soberanías

**Ubicación:** `apps/api/src/services/fluxcore/runtime-gateway.service.ts`  
**Responsabilidad:** "Registry of sovereign runtimes" (Canon §4.2). Administra qué motores de IA están disponibles y rutea las peticiones hacia ellos.

---

## 🧩 1. Propósito y Canon

El sistema no está acoplado a un solo proveedor (como OpenAI). Existen múltiples "Runtimes" soberanos (AsistentesLocal, AsistentesOpenAI, Fluxy). El `RuntimeGateway` funciona como un patrón *Strategy/Registry*.

**Regla de Oro:** Este servicio NO decide *a cuál* runtime llamar. Esa es responsabilidad del `CognitiveDispatcher`. El Gateway solo sabe *cómo* llamarlo y cómo proteger al sistema si el runtime falla.

---

## ⚙️ 2. Mecanismos Core

### 2.1 Registro Dinámico
En el arranque del sistema (`startup`), los diferentes módulos registran sus adaptadores:
```typescript
runtimeGateway.register(new AsistentesLocalRuntime());
runtimeGateway.register(new AsistentesOpenAIRuntime());
```

### 2.2 Enrutamiento (Invocation)
Expone el método `invoke(runtimeId, input, triggerSignalId)`:
1. Busca el `runtimeId` en su mapa en memoria.
2. Si no existe, lanza un error claro (`Runtime "X" not found`).
3. Envuelve la ejecución en límites estrictos.

### 2.3 Boundaries (Límites de Seguridad)
- **Timeouts:** Aplica un límite por defecto (ej. 30 segundos) para evitar que un runtime colgado paralice el worker indefinidamente.
- **Aislamiento de Errores:** Atrapa excepciones lanzadas por el SDK de OpenAI o Groq, y las empaqueta en errores genéricos manejables por el Dispatcher, sin romper el proceso principal.

---

## 🔄 3. Contrato de un Runtime (`RuntimeAdapter`)

Todo runtime registrado aquí debe cumplir con esta interfaz:

```typescript
interface RuntimeAdapter {
    runtimeId: string;       // ej: "asistentes_local"
    displayName: string;     // ej: "FluxCore Local Asistentes"
    
    // El método core: Recibe el mundo exterior y devuelve acciones
    handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>;
}
```

Las `ExecutionAction[]` son comandos agnósticos como `[{ type: 'send_message', content: 'Hola' }]`.

---

## 📋 4. Dependencias

No depende de base de datos ni servicios complejos. Es una clase pura de enrutamiento y registro en memoria.
