# 🧠 Auditoría Algorítmica: AsistentesLocalRuntime (v8.5)

Este documento detalla el funcionamiento interno del runtime local, identificado como el componente más denso de la arquitectura actual. Su lógica debe ser fragmentada en servicios de plataforma durante la Fase 3.

## 🏗️ Estructura del Pipeline Cognitivo

El runtime local no realiza una llamada directa al LLM, sino que ejecuta un pipeline complejo de 5 fases para garantizar precisión y ahorro de tokens:

### Fase 0: Tamiz Semántico (Context Sieve)
- **Función:** Filtra el universo de plantillas autorizadas de la cuenta (~100+) a un subconjunto relevante (~10) mediante búsqueda vectorial.
- **Lógica:** Usa `templateSemanticService` con un umbral de similitud del 10%.
- **Observación:** Esta lógica es de plataforma y debe ser extraída al `SemanticSieveService`.

### Fase 1: Intent Router (Inteligencia de Enrutamiento)
- **Función:** Utiliza una llamada LLM ligera para decidir qué plantillas son candidatas y extraer una "Intención de Búsqueda" limpia.
- **Lógica:** Genera un `matchedTemplateIds` y un `extractedIntent`.

### Fase 1.5: Shortcut Determinista (Fast-Path)
- **Función:** Si la intención es simple (ej. saludo) y hay una plantilla estática que encaja al 100%, el sistema cancela el pipeline de IA y devuelve la plantilla directamente.
- **Impacto:** Ahorro masivo de latencia y tokens.

### Fase 2: RAG Determinista (Inyección de Conocimiento)
- **Función:** Realiza la búsqueda en los Vector Stores usando la intención extraída en la Fase 1, no el mensaje crudo del usuario.
- **Lógica:** Usa `retrievalService.buildContext`.

### Fase 3: Modo Resolutivo (Final Execution)
- **Función:** La llamada principal al LLM con todo el contexto purificado. Soporta multi-ronda de herramientas (hasta 3 rondas).

## 🛡️ Sistema de Soberanía de Identidad (Masking)

El runtime implementa un sistema de seguridad de dos pasos:
1. **Masking (Pre-procesamiento):** Genera máscaras de 4 caracteres para cada UUID de plantilla. Sustituye cualquier mención de UUIDs en las instrucciones y el perfil de negocio por estas máscaras.
2. **Unmasking (Post-procesamiento):** Traduce las máscaras detectadas en la respuesta de la IA de vuelta a UUIDs reales antes de devolver las acciones.

## ⚠️ Puntos de Dolor Identificados

1. **Acoplamiento de Seguridad:** El sistema de enmascaramiento es manual y local. Si se usa OpenAI, hoy no goza de este nivel de protección a menos que se duplique el código.
2. **Desecho de Tokens:** El parsing de plantillas usa Regex pesadas y lógica de "residual text" que debería ser un estándar de plataforma.
3. **Acceso a DB:** A pesar de los invariantes, el runtime consulta la base de datos para listar plantillas de la cuenta.

## 📋 Recomendación de Refactorización (Fase 3)

1. Mover **Fase 0 y Fase 2** al `SemanticSieveService`.
2. Mover la **Soberanía de Identidad** al `SovereignIdentityService`.
3. Mover el **Parsing de Respuestas** al `CognitiveParserService`.
4. El runtime debe quedar reducido a: `Recibir Input -> Invocar LLM -> Devolver Output Crudo`.
