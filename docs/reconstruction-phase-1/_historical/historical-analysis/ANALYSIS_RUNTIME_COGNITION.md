# Análisis Crítico: Desconexión entre Perfil (ChatCore) y Runtime Cognitivo (FluxCore)

## 1. El Incidente

Durante las pruebas, se observó que la IA respondía asumiendo la identidad de "Cori, el asistente de Daniel" en lugar de utilizar el perfil de la cuenta configurado (una Floristería virtual con instrucciones específicas sobre arreglos florales, precios y entregas). 

A pesar de que la base de datos contenía el `profile` y `private_context` correctos en la tabla `accounts`, y el flujo de eventos funcionaba sin errores, la IA ignoraba completamente esta información.

## 2. Diagnóstico del Flujo: ChatCore -> Kernel -> FluxCore

Al revisar los logs de ejecución, se evidenció la estricta separación de responsabilidades en la arquitectura:

1. **ChatCore (Ingreso de Datos):** 
   - Procesó correctamente el mensaje entrante ("vendes algun producto?").
   - Lo persistió y generó un evento `EXTERNAL_INPUT_OBSERVED`.
2. **Kernel (Puente):** 
   - Certificó y enrutó el evento hacia los proyectores de FluxCore.
3. **FluxCore (CognitionWorker & CognitiveDispatcher):**
   - Inició el turno de respuesta.
   - Construyó el `PolicyContext` para determinar cómo debía responder el `asistentes-local`.
   - **PUNTO DE FALLA:** Al construir el `PolicyContext`, el objeto `resolvedBusinessProfile` quedó completamente vacío `{}`.

## 3. Causa Raíz: El Ciclo de Vida de `authorized_data_scopes`

El problema no era un fallo en el guardado del perfil, sino un diseño intencional de privacidad y gobernanza en FluxCore que no estaba siendo completado en el ciclo de vida de la configuración del usuario.

En la arquitectura de FluxCore, un asistente (Cognición) no tiene acceso inherente a los datos de la cuenta (Identidad/ChatCore). El acceso está mediado por `authorized_data_scopes`. 

```typescript
// extracto de flux-policy-context.service.ts
const resolvedBusinessProfile = assistant
    ? await this.resolveBusinessProfile(accountId, assistant.authorizedDataScopes ?? [])
    : {};
```

- **Estado previo:** El asistente asignado (`5bbac0a1...`) tenía `authorized_data_scopes = {}` (vacío).
- **Consecuencia:** `resolveBusinessProfile` devolvió un objeto vacío, ocultando el `displayName`, la `bio` y el `privateContext` al Prompt Builder.
- **Origen de "Cori":** Al no tener el perfil del negocio, el `PromptBuilder` solo utilizó las instrucciones directas vinculadas al asistente en la tabla `fluxcore_instructions` (que tenían un prompt por defecto heredado: "Eres Cori, el asistente de Daniel...").

## 4. Reflexión Arquitectónica y Riesgos

El usuario señaló correctamente: *"no podemos ir picoteando código. Tenemos que entender qué pasa cuando alguien actualiza su perfil y eso cómo afecta a fluxcore..."*.

Actualizar el perfil en `accounts` (ChatCore) **no debe** alterar automáticamente los permisos del asistente en `fluxcore_assistants` (FluxCore). Hacerlo rompería el encapsulamiento de los dominios. ChatCore no debería saber qué permisos necesita el motor cognitivo.

Sin embargo, desde la perspectiva del usuario final, si actualizan el perfil de su negocio y el asistente no lo refleja, perciben el sistema como "roto".

## 5. Plan de Solución Recomendado

Para resolver esta fricción sin violar las fronteras de los dominios, se proponen las siguientes medidas estructurales:

### A. UI: Gestión Explícita de Permisos (Recomendado)
Cuando el usuario configura su asistente en el panel de **Extensions / FluxCore**, debe haber un apartado de permisos donde explícitamente autorice al asistente a leer su perfil.
- Checkboxes para: "Permitir leer el nombre público", "Permitir leer la biografía", "Permitir leer las instrucciones privadas".
- Esto enviaría un PATCH a `/fluxcore/assistants/:id` actualizando los `authorized_data_scopes`.

### B. Valores por Defecto Sensatos en Creación
Al crear un asistente por defecto para una nueva cuenta, la capa de inicialización debería inyectar un array básico de scopes:
`authorized_data_scopes = ['displayName', 'bio', 'privateContext']`.
Esto asegura que la experiencia inicial de "conectar y usar" funcione (Out of the Box) utilizando la información que el usuario introdujo en su perfil, sin obligarle a entender de inmediato el modelo de permisos.

### C. Consolidación del "System Default Prompt"
Las instrucciones (`fluxcore_instructions`) que contengan prompts específicos como "Eres Cori..." deben ser tratadas como datos de prueba (seed data) y deben ser reemplazadas por un template dinámico genérico (ej. "Eres el asistente de {{businessName}}...") o dejarse en blanco para que el PromptBuilder confíe plenamente en el `resolvedBusinessProfile`.

## 6. Conclusión
El motor cognitivo operó exactamente según su diseño de seguridad (Zero-Trust respecto a los datos de la cuenta). La desconexión ocurre en la **Capa de Experiencia / Orquestación**, donde no se estaba mapeando la intención del usuario ("quiero que este asistente lea mi perfil") hacia el modelo de datos de permisos de FluxCore (`authorized_data_scopes`). La actualización directa en BD que realizamos fue un workaround de diagnóstico; la solución real requiere exponer estos scopes en la configuración de la extensión en el frontend.
