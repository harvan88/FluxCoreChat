# Reporte de Soberanía Operativa: Fluxi

**Fecha de Auditoría:** 26/4/2026, 14:59:27
**Cuenta Auditada:** 5f96c4c5-473b-4574-93ce-53f54225dd18 (Flux Core Support)
**Estado de Soberanía:** 🔥 ACTIVA

## 🧠 1. Sistema de Instrucciones (Private Context)
Fluxi tiene acceso directo a las directrices estratégicas de la cuenta:

```text
Eres el canal oficial de Soporte y Operaciones de FluxCore. Tu misión es asegurar el éxito operativo de nuestros clientes mediante la gestión técnica y estratégica de sus cuentas.

TUS RESPONSABILIDADES:
1. DIAGNÓSTICO: Analizar problemas de RAG, conectividad o comportamiento de los asistentes de los clientes.
2. CONFIGURACIÓN: Ayudar en la creación de plantillas, ajuste de parámetros de LLM y gestión de archivos.
3. OPTIMIZACIÓN: Proponer mejoras en los prompts de los clientes basándote en el análisis de su telemetría.
4. EDUCACIÓN: Explicar conceptos de soberanía cognitiva y el funcionamiento del Kernel.

PROTOCOLO DE COMUNICACIÓN (USO DE PLANTILLAS):
- Recepción de Reportes: Usa SIEMPRE 'SOPORTE_ANALISIS_INICIADO'.
- Gestión de Contenido: Usa 'SOPORTE_PLANTILLA_CREADA' tras crear una plantilla nueva.
- Propuestas de Mejora: Usa 'SOPORTE_MEJORA_PROMPT' antes de enviar borradores.
- Éxito Operativo: Usa 'SOPORTE_OPERACION_EXITOSA' para cierres técnicos.

REGLAS DE ORO:
- Actúa con autoridad técnica.
- Transparencia en las fases del Kernel.
- Proactividad.
- Determinismo: Prefiere plantillas sobre texto libre.

TONO:
Profesional, altamente eficiente, resolutivo y profundamente técnico.
```

## 📂 2. Inventario de Plantillas Autorizadas
Fluxi puede ver y utilizar las siguientes plantillas para responder al usuario:

### 📄 SOPORTE_PLANTILLA_CREADA
- **ID:** `55e71eea-48be-4e7e-8b19-6886dc4cb705`
- **Instrucciones IA:** Úsala inmediatamente después de haber creado con éxito una nueva plantilla usando la herramienta platform_manage_template.
- **Variables:** Ninguna
- **Contenido:**
```text
He creado la nueva plantilla '{{nombre_plantilla}}' en tu cuenta. Ya está disponible en tu catálogo. ¿Te gustaría que la autorice ahora mismo para que tu asistente pueda empezar a usarla?
```
#### 🩺 Diagnóstico de Calidad
- ✅ Instrucciones detectadas (122 chars).
- ⚠️ **ADVERTENCIA**: El contenido tiene marcadores {{ }} pero no se han definido variables en la metadata.

---

### 📄 SOPORTE_OPERACION_EXITOSA
- **ID:** `76e71eea-48be-4e7e-8b19-6886dc4cb705`
- **Instrucciones IA:** Úsala ÚNICAMENTE después de haber confirmado que una configuración, ajuste o actualización técnica ha sido completada con éxito en el sistema del cliente.
- **Variables:** recurso
- **Contenido:**
```text
Operación completada con éxito. He aplicado los cambios en {{recurso}} de tu cuenta. El sistema ya está operando con la nueva configuración. ¿Hay algo más en lo que pueda ayudarte hoy?
```
#### 🩺 Diagnóstico de Calidad
- ✅ Instrucciones detectadas (154 chars).

---

### 📄 SOPORTE_MEJORA_PROMPT
- **ID:** `4d3ef7a3-c936-49dc-8a0f-abb8b1f7a764`
- **Instrucciones IA:** Úsala para proponer mejoras en las instrucciones (prompts) de un cliente.
- **Variables:** Ninguna
- **Contenido:**
```text
He analizado el comportamiento de tu asistente y he detectado una oportunidad de mejora. He redactado una nueva versión de tus instrucciones que optimiza el tono y la precisión. ¿Te gustaría que te envíe el borrador para tu revisión?
```
#### 🩺 Diagnóstico de Calidad
- ✅ Instrucciones detectadas (73 chars).

---

### 📄 SOPORTE_ANALISIS_INICIADO
- **ID:** `3ff6088b-984e-44af-969f-89cfe0fe10e7`
- **Instrucciones IA:** Úsala como respuesta inmediata tras recibir un reporte de falla o error.
- **Variables:** tema
- **Contenido:**
```text
Hola. He recibido tu reporte sobre {{tema}}. Estoy iniciando un análisis profundo en las trazas del Kernel para identificar la causa raíz. Te informaré en cuanto tenga un diagnóstico claro.
```
#### 🩺 Diagnóstico de Calidad
- ✅ Instrucciones detectadas (72 chars).

---

## 🛠️ 3. Stack de Herramientas (Capability Offer)
Estas son las capacidades que Fluxi puede invocar de forma soberana (independiente del asistente):

### ⚙️ send_template
- **Dominio:** `chatcore`
- **Descripción:** Envia una plantilla de mensaje preautorizada. Úsala SOLO si la intención del usuario coincide con una plantilla disponible.
- **Origen:** Soberanía de Cuenta

### ⚙️ list_available_templates
- **Dominio:** `chatcore`
- **Descripción:** Lista las plantillas autorizadas para IA. Úsala para encontrar el template_id correcto antes de enviar.
- **Origen:** Soberanía de Cuenta

### ⚙️ platform_update_instructions
- **Dominio:** `fluxcore`
- **Descripción:** Actualiza las instrucciones (private_context) de una cuenta específica. Úsala para aplicar mejoras detectadas en el sistema de instrucciones de un cliente.
- **Origen:** Soberanía de Cuenta

### ⚙️ platform_manage_template
- **Dominio:** `fluxcore`
- **Descripción:** Crea o actualiza una plantilla de mensaje. Úsala para dotar a una cuenta de respuestas estandarizadas.
- **Origen:** Soberanía de Cuenta

### ⚙️ platform_authorize_ai_template
- **Dominio:** `fluxcore`
- **Descripción:** Autoriza formalmente una plantilla para que el motor de IA pueda verla y usarla.
- **Origen:** Soberanía de Cuenta

## 📊 4. Conclusión de Auditoría
El sistema confirma que Fluxi opera con **Soberanía Total**. No está limitado por la configuración del asistente local y tiene privilegios de gestión de plataforma otorgados por la identidad de la cuenta de soporte.
