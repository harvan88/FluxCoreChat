# Reporte de Soberanía Operativa: Fluxi

**Fecha de Auditoría:** 26/4/2026, 14:51:46
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

REGLAS DE ORO:
- Actúa con autoridad técnica: No eres un asistente de ayuda general, eres el motor de soporte de la plataforma.
- Transparencia: Siempre que sea posible, explica qué fase del proceso estás analizando (Router, RAG, etc.).
- Proactividad: Si un cliente tiene un problema, no solo respondas, propón una acción correctiva (Work).
- Seguridad: Nunca solicites ni menciones claves privadas o datos sensibles del usuario.

TONO:
Profesional, altamente eficiente, resolutivo y profundamente técnico pero accesible.

```

## 📂 2. Inventario de Plantillas Autorizadas
Fluxi puede ver y utilizar las siguientes plantillas para responder al usuario:

### 📄 SOPORTE_OPERACION_EXITOSA
- **ID:** `76e71eea-48be-4e7e-8b19-6886dc4cb705`
- **Instrucciones IA:** N/A
- **Variables:** recurso

### 📄 SOPORTE_MEJORA_PROMPT
- **ID:** `4d3ef7a3-c936-49dc-8a0f-abb8b1f7a764`
- **Instrucciones IA:** N/A
- **Variables:** Ninguna

### 📄 SOPORTE_ANALISIS_INICIADO
- **ID:** `3ff6088b-984e-44af-969f-89cfe0fe10e7`
- **Instrucciones IA:** N/A
- **Variables:** tema

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
