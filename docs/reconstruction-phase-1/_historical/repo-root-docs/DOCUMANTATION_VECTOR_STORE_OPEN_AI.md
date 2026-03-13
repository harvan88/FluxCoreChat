# Documentación Técnica: OpenAI Vector Stores en FluxCore

## 1. Arquitectura de Sincronización
La integración con OpenAI sigue un modelo de **Sincronización por Referencia**. 
- **Fuente de Verdad**: OpenAI (`vs.openai.com`) es el propietario oficial de la data.
- **Cache Local**: La base de datos local almacena metadatos (`externalId`, `fileCounts`, `usageBytes`) para una UI fluida, pero se sincroniza obligatoriamente en lecturas críticas.

## 2. Reglas de Gestión de Archivos
A diferencia de los Vector Stores locales, los de OpenAI tienen un flujo desacoplado:
1. **Subida**: Los archivos se suben primero a OpenAI Files API con propósito `assistants`.
2. **Vinculación**: Se adjuntan al Vector Store.
3. **Eliminación**: 
   - Al eliminar un archivo del Vector Store, FluxCore ejecuta una **Eliminación Absoluta**.
   - Se desvincula el archivo del Vector Store AND se elimina el objeto `file` de la cuenta de OpenAI para evitar cargos de almacenamiento fantasmas.

## 3. Políticas de Expiración
OpenAI gestiona la expiración basada en el ancla `last_active_at`.
- **Nunca**: La política local se marca como `never`, lo que mapea a `expires_after: null` en OpenAI.
- **Días de Inactividad**: Se especifica un número de días (1 a 365). OpenAI eliminará automáticamente el Vector Store si no hay actividad en ese periodo.

## 4. UI Patterns (Patrón FluxCore)
- **Grid Layout**: Prohibido el uso de grids que rompan la jerarquía de secciones colapsables. Cada `CollapsibleSection` debe ocupar el ancho total de su contenedor para mantener la coherencia visual del entorno.
- **Auto-save**: Los cambios en el nombre o políticas de expiración se guardan inmediatamente (`onBlur` o `Enter`) para evitar discrepancias con el estado en cloud.
- **Tab Lifecycle**: Al eliminar un recurso desde su vista de detalle, la pestaña asociada DEBE cerrarse automáticamente.

## 5. Troubleshooting (Sección Diagnóstico)
La UI incluye una sección de diagnóstico para:
- Forzar resincronización total.
- Limpiar caches locales corruptas.
- Verificar el estado real en el panel de OpenAI via enlace externo.