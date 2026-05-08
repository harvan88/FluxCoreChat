# Reporte de Reconstrucción: Algoritmo V11 (Omni-Flow)
**Estado de la Refactorización: Conceptual Validado**

Este reporte detalla el comportamiento del sistema bajo tres escenarios reales de la Clínica Dr. Jones, demostrando la eficacia de las guardias de TypeScript para controlar el flujo de la IA.

---

## ESCENARIO A: El Bypass Inmediato (Eficiencia Máxima)
**Caso**: Usuario pide información general de estética.

1. **Mensaje**: "Me interesa el botox."
2. **FASE 0**: Sieve detecta `6e99c5...2af8` (Consulta Estética).
3. **FASE 1 (Router)**:
   - Recibe Alias: `6ef8`.
   - Salida: `{"plantillas": ["6ef8"]}`.
4. **GUARDIA TS (Orquestador)**:
   - Analiza `6ef8`. No tiene `{{ variables }}`. Es única.
   - **DECISIÓN**: `BYPASS`.
5. **RESULTADO**: El sistema envía la plantilla inmediatamente. 0 tokens gastados en F2 y F3.

---

## ESCENARIO B: Ambigüedad / Múltiples Plantillas (Seguridad Directa)
**Caso**: Usuario pide salud y pago.

1. **Mensaje**: "Hola, quiero saber cómo pago la consulta."
2. **FASE 0**: Sieve detecta `d676...124a` (Saludo) y `5207...7420` (Transferencia).
3. **FASE 1 (Router)**:
   - Recibe Alias: `d64a`, `5220`.
   - Salida: `{"plantillas": ["d64a", "5220"]}`.
4. **GUARDIA TS (Orquestador)**:
   - Recuenta: 2 plantillas.
   - **DECISIÓN**: `NO BYPASS` (Requiere orquestación humana/resolutiva).
   - **ACCION**: Avanzar a F3 (F2 se omite si no hay variables que requieran búsqueda profunda).
5. **FASE 3 (Resolutiva)**:
   - **Prompt**: "Se han detectado d64a y 5220. Tu misión es saludarlos y darles los datos de pago."
6. **RESULTADO**: La IA emite ambas llamadas a la vez tras un breve saludo.

---

## ESCENARIO C: Extracción de Datos + RAG (Inteligencia Híbrida)
**Caso**: Interés en cirugía con datos parciales.

1. **Mensaje**: "Hola, soy Juan, quiero operarme la nariz."
2. **FASE 0**: Sieve detecta `f704...ca42` (Pre-Agendamiento Cirugía).
3. **FASE 1 (Router)**:
   - Recibe Alias: `f742`.
   - Salida: `{"plantillas": ["f742"], "intencion_busqueda": "rinoplastia precio agendamiento"}`.
4. **GUARDIA TS (Orquestador)**:
   - Analiza `f742`. Requiere `{{Nombre del Paciente}}`.
   - **DECISIÓN**: `NO BYPASS`. Activar **FASE 2 (RAG)** para datos de rinoplastia.
5. **FASE 2 (RAG)**:
   - Busca "rinoplastia". Extrae párrafos sobre cuidados y política de agendamiento.
6. **FASE 3 (Extractor)**:
   - **Prompt Limpio**: "Debes llenar {{Nombre del Paciente}} para la plantilla f742. Si tienes info extra de RAG, úsala para el cierre."
   - **Análisis IA**: Ve en el historial que el usuario dijo "soy Juan".
7. **RESULTADO FINAL**:
   - `CALL_TEMPLATE:f704...ca42 {"Nombre del Paciente": "Juan"}`
   - *Texto Seguimiento*: "Juan, recordá que la rinoplastia requiere una consulta previa para diagnóstico. Arriba te pasé los datos para reservar."

---

## Cuadro Resumen de Guardias

| Condición | Ruta | Razón |
| :--- | :--- | :--- |
| **Templates = 0** | ➔ F3 Conversacional | No hay herramientas disponibles. |
| **Template = 1 && Variables = NO** | ➔ **BYPASS** | El sistema es 100% predecible. Ahorro total. |
| **Template > 1** | ➔ F3 Resolutiva | Se requiere redacción para unir las ideas. |
| **Variables = SÍ** | ➔ **F2 RAG** + F3 Extractor | Se requiere cerebro para extraer datos y dar contexto oficial. |
