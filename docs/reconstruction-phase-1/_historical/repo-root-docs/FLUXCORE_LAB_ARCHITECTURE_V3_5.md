# Arquitectura de Agente Híbrido FluxCore Lab V3.5
## Informe Técnico: "Smart Tools" y Restauración del Bucle Agéntico

**Fecha:** 26 de Enero, 2026
**Autor:** FluxCore Lab Research Team
**Versión:** 3.5 (Hybrid ReAct + Smart Tools)

---

## 1. Cambio de Paradigma: De FSM a "Smart Tools"

Tras experimentar con modelos puramente deterministas (FSM) y notar una degradación en la experiencia de usuario (rigidez robótica, incapacidad de entender contextos vagos como "mañana a la misma hora"), la Arquitectura V3.5 restaura el bucle de razonamiento **ReAct** (Reason+Act) pero mueve la complejidad lógica **hacia adentro de las herramientas**.

El LLM vuelve a ser libre de conversar, pero sus manos (las herramientas) ahora tienen guantes de seguridad inteligentes.

---

## 2. Componentes Clave

### 2.1. The "Smart Tool" Pattern
Una herramienta ya no es una simple llamada a API ("dumb pipe"). Es un micro-programa con autonomía limitada para resolver ambigüedades antes de molestar al usuario o fallar.

**Caso de Estudio: `update_calendar_event`**
En lugar de fallar si el LLM envía "Reunión de Daniela" (texto) en lugar de un ID, la herramienta:
1.  **Intercepta** el input del LLM.
2.  **Detecta** con regex si es un ID técnico o lenguaje natural.
3.  **Ejecuta** una búsqueda contextual (`calendar.events.list({ q: "Reunión de Daniela" })`).
4.  **Resuelve** el ID real (`abc12345...`) automáticamente.
5.  **Procede** con la validación y ejecución.

Esto permite que el usuario hable natural ("Cambia la reunión de X") y el sistema funcione técnicamente, eliminando los errores 404 por alucinación de IDs.

### 2.2. Validación Determinista "In-Loop"
Las reglas de negocio (Horarios Laborales, Solapamientos, Búfers) son aplicadas por la herramienta **antes** de confirmar la acción a Google, pero **dentro** del flujo de la herramienta.

*   **Si falla una regla**: La herramienta retorna un error estructurado JSON al LLM (`{ status: error, message: "Solapamiento con Reunión Y", suggestion: "Prueba 15:00" }`).
*   **Reacción Agéntica**: El LLM (que ahora es "libre") lee este error y lo traduce a lenguaje natural para negociar con el usuario: *"No puedo a esa hora porque choca con la Reunión Y, ¿te parece a las 15:00?"*.

---

## 3. Estado del Arte (Implementación Actual)

### 3.1. Bucle Cognitivo (The Brain)
*   **Motor**: GPT-4o-mini configurado con System Prompt de "Orquestador de Inteligencia".
*   **Contexto Temporal**: Inyección dinámica de `nowContext` (Fecha/Hora del Sistema) en cada prompt, permitiendo al LLM resolver con precisión matemática referencias relativas como "mañana", "el próximo jueves", "en 2 horas".
*   **Persistencia**: Gestión de Tokens OAuth2 (Refresh Token) en SQLite con auto-renovación invisible "Silent Auth".

### 3.2. Stack de Herramientas Blindadas
1.  **Calendario**: 
    *   `create/update`: Protegidas por `validateCalendarRules`.
    *   `list`: Optimizada para contexto.
    *   `delete`: Requiere ID (pero el update inteligente reduce la necesidad de borrar y crear).
2.  **Web Search**: DuckDuckGo + Jina (Scraping de contenido limpio).
3.  **MercadoLibre**: Búsqueda estructurada de productos (Precios, Títulos).

---

## 4. Conclusión
La V3.5 representa el equilibrio óptimo encontrado tras iterar sobre FSM:

1.  **Libertad** para el diálogo (LLM en control del flujo conversacional).
2.  **Determinismo** para la ejecución (Código duro protegiendo la API).
3.  **Inteligencia** para la resolución de entidades (Smart Tools que buscan IDs).

El sistema es resistente a errores técnicos (404, Auth), conversacionalmente fluido (entiende "mañana") y técnicamente robusto (respeta horarios de negocio).

---
*Documento generado automáticamente a partir de la implementación final en `backend/index.js`.*
