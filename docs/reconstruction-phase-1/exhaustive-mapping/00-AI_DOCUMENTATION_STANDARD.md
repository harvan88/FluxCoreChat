# 🤖 Estándar de Documentación para IA (FluxCore)

**Ubicación:** `docs/reconstruction-phase-1/exhaustive-mapping/00-AI_DOCUMENTATION_STANDARD.md`
**Propósito:** Reglas ESTRICTAS y deterministas sobre cómo cualquier IA debe crear, actualizar o evaluar la documentación en el sistema FluxCore.
**Estado:** ✅ STABLE

---

## 🛑 REGLA CERO: NUNCA INFERIR, SIEMPRE LEER
La IA **NUNCA** debe documentar basándose en suposiciones. Antes de escribir o modificar documentación, la IA DEBE leer el código fuente real del componente y sus dependencias directas.

---

## 🧩 1. Sistema de Frontmatter (Obligatorio)

Todo documento `.md` DEBE comenzar exactamente con el siguiente bloque de metadatos YAML (Frontmatter). El validador fallará inmediatamente si este bloque no existe o está malformado.

```yaml
---
id: "nombre-unico-kebab-case"
type: "core" # Opciones: core | subsystem | smart-component | ui-component
status: "wip" # Opciones: wip | stable | needs_review | deprecated
criticality: "high" # Opciones: high | medium | low
location: "apps/ruta/exacta/archivo.ts"
---
```

### 1.1. Diccionario de Estados (`status`)
- `wip`: Documento creado pero incompleto. Le faltan secciones o el código sigue cambiando rápido.
- `needs_review`: El documento está completo, pero el código cambió y necesita que la IA lo valide de nuevo.
- `stable`: Documento preciso, validado contra el código actual.
- `deprecated`: El componente ya no se usa, pero el documento se mantiene por contexto histórico.

### 1.2. Diccionario de Tipos (`type`)
- `core`: Motores, utilidades globales, configuración (ej: `ai.service.ts`, `server.ts`).
- `subsystem`: Agrupadores lógicos o módulos de alto nivel (ej: `TEMPLATES_SUBSYSTEM.md`).
- `smart-component`: Componentes React que tienen estado, consumen hooks o APIs (ej: `TemplateManager.tsx`).
- `ui-component`: Componentes React puros/presentacionales sin lógica de negocio (ej: `Button.tsx`).

---

## 📐 2. Validación Asimétrica (Tiers de Contenido)

El contenido requerido bajo el Frontmatter depende ESTRICTAMENTE del `type` declarado.

### Tier 1: `core` y `subsystem`
**Requisitos Mínimos:**
1. **Propósito:** Un párrafo claro de qué hace y por qué existe.
2. **Arquitectura:** Flujo de datos o diagrama/explicación de cómo interactúa con otras partes.
3. **Dependencias:** Qué otros sistemas dependen de él (quién lo llama) y de quién depende.

### Tier 2: `smart-component`
**Requisitos Mínimos:**
1. **Propósito:** Qué problema resuelve en la UI.
2. **Estado y Datos:** Hooks utilizados (`useState`, `useStore`), props que recibe y endpoints que consume.
3. **Flujos (Interacciones):** Qué pasa cuando el usuario interactúa (ej: "Al hacer click en Guardar, llama a X").

### Tier 3: `ui-component`
**Requisitos Mínimos:**
1. **Propósito:** Definición breve.
2. **Props:** Interfaz exacta de las propiedades que acepta.
3. **Ejemplo de Uso:** Un bloque de código simple de cómo instanciarlo.

---

## 🚨 3. Protocolo de Modificación para la IA

Cuando el usuario pide documentar o actualizar algo, la IA DEBE seguir estos pasos:

1. **Buscar el archivo** en el código fuente.
2. **Buscar el documento `.md`** correspondiente (si existe).
3. **Actualizar el Frontmatter:** Si el código cambió significativamente, cambiar el `status` a `needs_review` y alertar al usuario, O actualizar la documentación y marcarlo como `stable`.
4. **Verificar los Tiers:** Asegurarse de que el documento cumple con los requisitos mínimos de su `type`.
5. **No ser pedante con los títulos:** Usar Markdown válido (`#`, `##`) pero sin obligar a emojis exactos a menos que mejoren la legibilidad. El validador lee semántica, no formato estricto.

---

## 🛠 4. Checklist para la IA
- [ ] ¿Puse el Frontmatter YAML al principio?
- [ ] ¿El `location` apunta a una ruta real absoluta desde la raíz del repo?
- [ ] ¿El `type` coincide con la naturaleza real del código?
- [ ] ¿Cumple con los requisitos mínimos de su Tier?
- [ ] ¿Eliminé información obsoleta que ya no está en el código?
