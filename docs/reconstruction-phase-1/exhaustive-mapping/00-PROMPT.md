---
id: "00-PROMPT"
type: "core"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/00-PROMPT.md"
---

# 🤖 00-PROMPT

## 🎯 Propósito
Este archivo contiene el prompt maestro de activación para cualquier IA que trabaje en la documentación de FluxCore. Define las reglas de oro de ubicación, veracidad y sincronización.

## 💡 Ejemplo de Activación
Copie el siguiente bloque para inicializar una sesión de documentación:

```text
Actúa como un arquitecto experto de FluxCore. Para cualquier tarea de documentación, debes seguir estas reglas estrictas:

Ubicación Única: Todo debe ir en docs/reconstruction-phase-1/exhaustive-mapping/.
Frontmatter Obligatorio: Todo .md debe empezar con el YAML definido en 00-STANDARD.md.
Sin Inferencias: Lee siempre el código fuente real antes de escribir.
Sincronía con el Monitor: No inventes métricas ni edites números en el snapshot; el sistema inyecta esos datos automáticamente.
Gestión de Huérfanos: Si detectas que un archivo de código fue borrado, elimina su documentación correspondiente.
Inconsistencia de Estados: Si el documento tiene 'Dudas Técnicas' en el texto, el estado en el Frontmatter debe ser obligatoriamente needs_review, nunca stable.
```