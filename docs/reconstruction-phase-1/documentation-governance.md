# Gobernanza documental y fuente única de verdad

## Objetivo de este documento

Definir cómo se va a mantener la documentación del sistema a partir de ahora para reducir ruido, evitar duplicados y dejar una sola fuente activa de verdad.

## 1. Carpeta activa oficial

Desde esta reconstrucción, la carpeta activa oficial de arquitectura y funcionamiento del sistema es:

- `docs/reconstruction-phase-1`

Esta carpeta debe considerarse la única fuente activa de verdad documental para:

- arquitectura por dominios
- definiciones canónicas validadas
- componentes reales del código
- flujos transversales del sistema
- capítulos nuevos que se sigan escribiendo

## 2. Regla operativa principal

**No se deben crear nuevos documentos arquitectónicos fuera de `docs/reconstruction-phase-1`.**

Si aparece nueva información importante:

- se incorpora a esta carpeta
- se actualiza un documento existente, o
- se crea aquí un nuevo subdocumento temático

## 3. Estatus de la documentación fuera de la carpeta activa

La documentación histórica fuera de `docs/reconstruction-phase-1` debe tratarse con alguno de estos estados:

### A. Fuente conceptual recuperable

Documentos que pueden seguir leyéndose para rescatar definiciones o decisiones bien pensadas, pero nunca como verdad automática.

Ejemplos:

- `.windsurf/rules/canon-fluxcore.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md`
- `docs/reconstruction-phase-1/_historical/chatcore/ChatCore - Vision Document.md`
- `docs/reconstruction-phase-1/_historical/chatcore/Asset Infrastructure - Unified Design.md`
- `docs/reconstruction-phase-1/_historical/archive/HITO_COR004_ACTOR_MODEL.md`

### B. Referencia histórica

Documentos útiles para contexto, auditorías, evolución o troubleshooting, pero no para documentar el presente sin revalidación.

Ejemplos:

- auditorías puntuales
- planes de migración
- refactors históricos
- reportes de bugs

### C. Candidatos a absorción y archivo

Documentos cuyo contenido importante debe ser absorbido por la carpeta activa y luego archivado o despriorizado explícitamente.

## 4. Qué ya fue absorbido en la carpeta activa

La carpeta activa ya absorbió o empezó a absorber estas líneas conceptuales:

- separación canónica de dominios ChatCore / Kernel / FluxCore
- soberanía del Kernel
- projectores como mecanismo derivado
- turno conversacional como unidad cognitiva
- separación `PolicyContext` vs `RuntimeConfig`
- actor model con `fromActorId` como identidad canónica del mensaje
- assets como infraestructura de primera clase

Esto vive ahora en:

- `README.md`
- `canonical-definitions.md`
- `chatcore-overview.md`
- `kernel-overview.md`
- `fluxcore-overview.md`
- `chatcore-components.md`
- `kernel-components.md`
- `fluxcore-components.md`
- `system-flows.md`
- `chatcore-assets.md`

## 5. Reglas para depurar documentación vieja

Cuando un documento histórico contenga valor mezclado con obsolescencia, aplicar esta secuencia:

1. extraer la definición o idea útil
2. validarla contra código y schema actuales
3. integrarla a la carpeta activa
4. dejar el documento histórico como referencia no canónica o moverlo a archivo

## 6. Qué NO debe volver a pasar

- múltiples markdowns compitiendo por definir la arquitectura actual
- documentos conceptuales no validados contra el código
- nuevos capítulos arquitectónicos desperdigados entre raíz, `_historical` y otros lugares fuera de la carpeta activa
- uso de documentos viejos como si fueran fuente canónica sin pasar por validación

## 7. Limpieza recomendada del repositorio documental

### Prioridad alta

Mantener activos solo los documentos de `docs/reconstruction-phase-1` para trabajo corriente.

### Prioridad media

Reclasificar progresivamente documentos históricos en grupos:

- `historical-canon-sources`
- `historical-audits`
- `historical-plans`
- `historical-implementation-notes`

### Prioridad baja

Mover o archivar físicamente los documentos ya absorbidos cuando deje de ser necesario consultarlos.

## 8. Inventario inicial de absorción prioritaria

Documentos que conviene absorber o dejar expresamente subordinados a la carpeta activa:

- `docs/reconstruction-phase-1/_historical/chatcore/ChatCore - Vision Document.md`
- `docs/reconstruction-phase-1/_historical/chatcore/Asset Infrastructure - Unified Design.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/FLUXCORE_ASISTENTES_CANON.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/FLUXCORE_WES_CANON.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/POLICY_CONTEXT_GUIDE.md`
- `docs/reconstruction-phase-1/_historical/archive/HITO_COR004_ACTOR_MODEL.md`
- `docs/reconstruction-phase-1/_historical/kernel/CHATCORE_KERNEL_INTERSECTION.md`

## 9. Decisión documental vigente

A partir de ahora, la conversación arquitectónica del proyecto debe continuar dentro de `docs/reconstruction-phase-1`.

Todo lo demás queda subordinado a una de estas funciones:

- insumo histórico
- evidencia de auditoría
- material a absorber
- material a archivar
