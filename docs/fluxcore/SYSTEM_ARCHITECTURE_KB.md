# Flux Core — System Architecture Knowledge Base

**Entidad:** Architecture Knowledge Base (AKB)  
**Nivel:** Principal / Staff Engineer  
**Fuente de Verdad:** Código Fuente (`packages/db`, `extensions/fluxcore`, `apps/api`)  
**Estado:** VIVO (Refleja la implementación actual)

---

## 1. SYSTEM CANON
**Definición Ontológica del Sistema**

Flux Core **NO** es un chatbot. Es un **Sistema Operativo de Trabajo (Work Operating System - WOS)** impulsado por evidencia lingüística.

*   **Identidad**: Motor transaccional que convierte intención (lenguaje natural ambiguo) en ejecución (transacciones deterministas) con garantías de auditabilidad.
*   **Unidad Fundamental**: El **Work** (Trabajo). NO el mensaje, NO la conversación.
    *   Una conversación es efímera. Un Work es una entidad de negocio persistente con ciclo de vida (FSM).
*   **Responsabilidad Permanente**: Garantizar que **ningún efecto externo irreversible** ocurra sin:
    1.  Evidencia textual explícita (Traceability).
    2.  Confirmación semántica (ambiguity resolution).
    3.  Garantía de unicidad (Idempotency via Claims).

---

## 2. AUTHORITY MODEL
**Jerarquía de Control y Entidades Cognitivas**

El sistema opera bajo un modelo de **Inversión de Control Estricta**. La IA no tiene autoridad operativa; solo tiene autoridad propositiva.

### 2.1 Entidades y Permisos

| Entidad | Naturaleza | Autoridad | Capacidades |
| :--- | :--- | :--- | :--- |
| **User** | Humana | **Soberana** | Confirmar acciones, cancelar Works, proveer evidencia. |
| **WES** (Work Engine) | Determinista | **Gobernador** | Commitear estado (`fluxcore_works`), ejecutar Tools, bloquear efectos. |
| **FluxCore Ext** | Híbrida | **Orquestador** | Gestionar el ciclo de vida del Assistant, inyectar contexto. |
| **Assistant** | Cognitiva | **Propositiva** | Generar `ProposedWork`, conversar (`DecisionEvent`). **NO** puede escribir en DB directamente. |
| **Fluxi** | Alias | **System Actor** | Cuenta de sistema (`seed-fluxi.ts`) para onboarding. Mismos límites que un Assistant. |

### 2.2 Transferencia de Autoridad
1.  **Conversational Mode**: El Assistant tiene la autoridad de responder texto libremente.
2.  **Transactional Mode (Work Activo)**: La autoridad se transfiere al **WES**. El Assistant solo actúa como "traductor" (Extractor) para llenar Slots.
3.  **Invalid States**:
    *   Un Assistant intentando ejecutar una Tool sin un Work activo (Violación de Protocolo).
    *   Un Assistant intentando confirmar un Slot sin evidencia textual (Alucinación bloqueada por Gate).

---

## 3. RUNTIME MESSAGE FLOW
**Traza de Ejecución (Happy Path: Start Work)**

Este flujo es la única manera válida en que un mensaje se convierte en acción.

1.  **Ingest (`ExtensionHost`)**:
    *   Mensaje entra a `ExtensionHost.processMessage`.
    *   **Paso Crítico**: Se ejecutan primero las System Extensions (`@fluxcore/wes`).
        *   Si hay un Work Activo, WES captura el mensaje y detiene la propagación a la IA general.

2.  **Cognitive Evaluation (Si no hay Work Activo)**:
    *   `ExtensionHost` pasa el control a `@fluxcore/fluxcore`.
    *   **Execution Plan**: `ai-execution-plan.service` verifica créditos, entitlements y status del proveedor.
    *   **Prompt Construction**: `PromptBuilder` inyecta `context.wes.availableWorkDefinitions`. La IA "ve" las definiciones pero no las ejecuta.

3.  **Intent Recognition**:
    *   El LLM responde con una estructura JSON `ProposedWork` (o texto simple).
    *   **Gateway (`wes-interpreter`)**:
        *   Valida que el JSON coincida con un `fluxcore_work_definitions` existente.
        *   **CRÍTICO**: Verifica que exista `evidence` (substring textual) para el `bindingAttribute` (ej: ID de cliente).
        *   Si falla la validación → Se degrada a respuesta conversacional.

4.  **Work Instantiation (WES)**:
    *   Si pasa el Gateway → `workEngine.openWork()`.
    *   Se crea registro en `fluxcore_works` (Estado: `CREATED` -> `ACTIVE`).
    *   Se persiste `fluxcore_decision_events` vinculando el mensaje original con el Work ID.

5.  **Execution Loop**:
    *   WES evalúa la FSM del Work.
    *   Si faltan Slots obligatorios → Solicita input al usuario (Estado `WAITING_USER`).
    *   Si están completos → Solicita `ExternalEffectClaim`.

---

## 4. DOMAIN MODEL
**Entidades Persistentes y su Significado Operativo (Reality)**

No son simples tablas; son conceptos del dominio.

*   **`Work` (`fluxcore_works`)**: La transacción viva. Tiene un `aggregate_key` (ej: `cita-2026-02-14`) que asegura unicidad de negocio (no puede haber dos citas al mismo tiempo para el mismo recurso).
*   **`WorkDefinition`**: El Contrato. Define la "Constitución" de un tipo de trabajo (FSM, Slots requeridos). Inmutable por versión.
*   **`Slot` (`fluxcore_work_slots`)**: Una variable de estado. No es un campo JSON suelto; tiene `set_by` (quién lo puso), `set_at` y `evidence` (por qué se puso).
*   **`DecisionEvent` (`fluxcore_decision_events`)**: La auditoría cognitiva. "La IA pensó X en el momento T". Inmutable.
*   **`SemanticContext`**: Un puente temporal para resolver ambigüedad. Vincula una pregunta del sistema ("¿Te refieres a esta cita?") con una respuesta futura ("Sí").
*   **`ExternalEffectClaim`**: Un "Lock" transaccional. Un permiso de ejecución de un solo uso.

---

## 5. INTEGRATION CONTRACTS
**Garantías y Expectativas**

### 5.1 Host Contract (`RuntimeServices`)
El Host garantiza a Flux Core:
*   **Inyección de Dependencias**: Acceso a DB, Vectores y Configuración via `fluxcore.service`.
*   **Hook Execution**: Garantiza llamar a `onMessage` antes de renderizar nada al usuario.
*   **Security Context**: Cada llamada viene con un `accountId` validado.

### 5.2 AI Provider Contract
El Sistema espera del Proveedor (OpenAI/Groq):
*   **Statelessness**: No se asume memoria entre llamadas. Todo el contexto necesario se re-inyecta via `PromptBuilder`.
*   **JSON Mode**: Se exige capacidad de respuesta estructurada para `wes-interpreter`.

### 5.3 Database Contract
*   **ACID**: WES depende estrictamente de transacciones atómicas para `ExternalEffectClaims`.
*   **Eventual Consistency (Vectores)**: La indexación de conocimiento (`fluxcore_vector_stores`) es asincrónica y no bloqueante.

---

## 6. ARCHITECTURAL DECISIONS (ADR)
**Racionalidad Inferida del Código**

1.  **ADR-001: WES como Máquina de Estados Finita (FSM)**
    *   **Por qué**: Para evitar loops infinitos de agentes reaccionarios y garantizar terminación.
    *   **Evidencia**: `fluxcore_works.state` y lógica de transición explícita en `work-engine.service`.

2.  **ADR-002: Inversión de Control en Herramientas (Smart Tools)**
    *   **Por qué**: Para evitar que la IA ejecute acciones destructivas alucinadas. La IA propone ("Creo que el usuario quiere borrar X"), el WES dispone (Verifica permisos y contexto antes de ejecutar).
    *   **Evidencia**: Separación entre `ProposedWork` y `ExternalEffect`.

3.  **ADR-003: Almacenamiento Híbrido (Relacional + JSON)**
    *   **Por qué**: Flexibilidad de esquema para `slots` (domain-specific) manteniendo integridad referencial para el ciclo de vida (`fluxcore_works` tables).
    *   **Evidencia**: Uso extensivo de columnas `jsonb` en `packages/db/src/schema/wes.ts`.

---

## 7. PERSISTENCE & STATE MODEL
**Semántica de la Verdad**

### 7.1 Fuente de Verdad (Source of Truth)
*   La **Base de Datos Relacional (`packages/db`)** es la única fuente de verdad operativa.
*   La **Memoria de la IA** (Context Window) es efímera y no confiable.
*   Los **Logs de Chat** son evidencia, no estado.

### 7.2 Garantías de Idempotencia
El sistema implementa el patrón **Claim Check** para efectos externos:
1.  Antes de llamar a una API externa (ej: Google Calendar), WES intenta insertar un `fluxcore_external_effect_claims`.
2.  Restricción `UNIQUE(account_id, semantic_context_id, effect_type)`.
3.  Si la inserción falla, se aborta la ejecución.
4.  Esto garantiza **Exactly-Once Execution** incluso si el worker se reinicia o la IA reintenta la llamada.

### 7.3 Inmutabilidad
*   **Event Sourcing Parcial**: `fluxcore_work_events` es append-only. Nunca se borra un evento.
*   **Decision Logs**: `fluxcore_decision_events` son inmutables. Si la IA cambia de opinión, genera un nuevo evento, no edita el anterior.

---

**Este documento debe ser consultado antes de cualquier refactorización que toque `extensions/fluxcore` o `packages/db`.**
