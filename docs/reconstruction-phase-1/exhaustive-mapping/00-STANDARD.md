---
id: "ai-documentation-standard"
type: "core"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/00-STANDARD.md"
---

# 🤖 Estándar de Documentación para IA (FluxCore)

**Ubicación:** `docs/reconstruction-phase-1/exhaustive-mapping/00-STANDARD.md`
## 🎯 Propósito
Este estándar define las reglas deterministas para la creación y mantenimiento de la documentación exhaustiva de FluxCore. Su objetivo es asegurar que tanto humanos como IAs generen contenido coherente, verificable y sincronizado con el código real.

## 💡 Ejemplo de Estructura Canónica
Cualquier documento debe seguir este esquema base:

```markdown
---
id: "nombre-del-componente"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/nombre.service.ts"
---

# 🤖 nombre.service

## 🎯 Propósito
Descripción breve...

## 💡 Ejemplo de Uso
bloc de código...
```

---

## 🛑 **REGLA CERO: ÚNICA CARPETA OFICIAL - PROHIBIDO SALIRSE**

### **🚨 PROHIBICIÓN ESTRICTA:**
- **ÚNICA CARPETA OFICIAL:** `docs/reconstruction-phase-1/exhaustive-mapping/`
- **ESTÁ PROHIBIDO:** Crear documentación en cualquier otra carpeta
- **ESTÁ PROHIBIDO:** Usar carpetas como `real/`, `pillars/`, `integration/`, `future/`
- **ESTÁ PROHIBIDO:** Dejar basura o ruido fuera de `exhaustive-mapping/`

### **🔥 CONSECUENCIAS DE VIOLACIÓN:**
- **Pérdida de tiempo** - Como acaba de suceder
- **Basura en el sistema** - Documentación desorganizada
- **Ruido y confusión** - Mezcla de real/futuro/viejo
- **Métricas incorrectas** - UI mostrará datos erróneos

### **✅ ÚNICO LUGAR PERMITIDO:**
```
docs/reconstruction-phase-1/exhaustive-mapping/
├── 00-STANDARD.md                  # Este estándar (+ Estrategia)
├── 00-INDEX.md                     # Índice maestro
├── 00-SNAPSHOT.md                  # Snapshot dinámico (Autogenerado)
├── 00-SNAPSHOT.template.md         # Plantilla para generación
├── 00-PROMPT.md                    # Prompt de activación
├── 01-ui-landscape/                # Flat: PascalCase.md
├── 02-backend-landscape/           # Flat: kebab-case.md
└── 03-database-landscape/          # Base de datos
```

---

## 🛑 **REGLA UNO: NUNCA INFERIR, SIEMPRE LEER**
La IA **NUNCA** debe documentar basándose en suposiciones. Antes de escribir o modificar documentación, la IA DEBE leer el código fuente real del componente y sus dependencias directas.

---

## 🧩 2. Sistema de Frontmatter (Obligatorio)

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

### 2.1. Diccionario de Estados (`status`)
- `wip`: Documento creado pero incompleto. Le faltan secciones o el código sigue cambiando rápido.
- `needs_review`: El documento está completo, pero contiene `DUDAS TÉCNICAS` que requieren decisión humana, o el código cambió y necesita que la IA lo valide de nuevo.
- `stable`: Documento preciso, validado contra el código actual, y **SIN dudas técnicas abiertas**.
- `deprecated`: El componente ya no se usa, pero el documento se mantiene por contexto histórico.

### 2.2. Diccionario de Tipos (`type`)
- `core`: Motores, utilidades globales, configuración (ej: `ai.service.ts`, `server.ts`).
- `subsystem`: Agrupadores lógicos o módulos de alto nivel (ej: `TEMPLATES_SUBSYSTEM.md`).
- `smart-component`: Componentes React que tienen estado, consumen hooks o APIs (ej: `TemplateManager.tsx`).
- `ui-component`: Componentes React puros/presentacionales sin lógica de negocio (ej: `Button.tsx`).

---

## 📐 3. Validación Asimétrica (Tiers de Contenido)

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

## 🚨 4. Protocolo de Modificación para la IA

Cuando el usuario pide documentar o actualizar algo, la IA DEBE seguir estos pasos:

1. **VERIFICAR UBICACIÓN:** Confirmar que el documento estará en `docs/reconstruction-phase-1/exhaustive-mapping/`
2. **Buscar el archivo** en el código fuente.
3. **Buscar el documento `.md`** correspondiente (si existe).
4. **Analizar el contenido FINAL a generar:** Identificar si durante la documentación hay cosas que no quedan claras o se generan "Dudas Técnicas".
5. **Actualizar el Frontmatter (CUIDADO CON LA TRAMPA TOP-DOWN):** Como la IA genera el texto de arriba hacia abajo, es común que ponga `status: "stable"` al inicio, y luego abajo escriba "Dudas Técnicas". **ESTO ES UN ERROR GRAVE.** Si vas a escribir dudas técnicas más abajo en el documento, DEBES poner `status: "needs_review"` en el YAML.
6. **Verificar los Tiers:** Asegurarse de que el documento cumple con los requisitos mínimos de su `type`.
7. **No ser pedante con los títulos:** Usar Markdown válido (`#`, `##`) pero sin obligar a emojis exactos a menos que mejoren la legibilidad. El validador lee semántica, no formato estricto.

---

## 🛠 5. Checklist para la IA

- [ ] ¿Puse el Frontmatter YAML al principio?
- [ ] ¿El `location` apunta a una ruta real absoluta desde la raíz del repo?
- [ ] ¿El `type` coincide con la naturaleza real del código?
- [ ] ¿Cumple con los requisitos mínimos de su Tier?
- [ ] ¿Eliminé información obsoleta que ya no está en el código?
- [ ] **🚨 ¿ESTÁ EN `exhaustive-mapping/`?** - VERIFICACIÓN CRÍTICA
- [ ] **🚨 NO CREÉ BASURA FUERA?** - VERIFICACIÓN CRÍTICA
- [ ] **🚨 ACTUALICÉ EL ÍNDICE?** - VERIFICACIÓN CRÍTICA
- [ ] **🔥 ¿REVISÉ EL FRONTEND Y BACKEND DEL SISTEMA?** - NUEVA REGLA CRÍTICA

---

### **ORDEN DOCUMENTAL (NUEVO):**
1. **FRONTEND UI:** Se documenta en `01-ui-landscape/`. Nomenclatura: `PascalCase.md`. (Basado en la realidad de React).
2. **BACKEND API:** Se documenta en `02-backend-landscape/`. Nomenclatura: `kebab-case.md`. (Basado en la realidad de Node/Bun).
3. **FLAT LANDSCAPE:** Prohibido crear subcarpetas dentro de los paisajes (v1.x). El orden viene dado por el nombre y el mapeo en el índice.

### **RUIDO Y ARCHIVOS DE SESIÓN (NUEVO):**
1. **EXCLUSIÓN DE SCRIPTS:** Los archivos de investigación (`audit-*.ts`, `debug-*.ts`, `check-*.ts`) NO son parte del paisaje arquitectónico y NO deben ser documentados en `exhaustive-mapping/`.
2. **UBICACIÓN DE INVESTIGACIÓN:** Notas de auditoría o trazas de sesiones anteriores DEBEN moverse a `docs/reconstruction-phase-1/history/`.

### **DOCUMENTATION QUALITY PANEL:**
1. **ÚNICA FUENTE DE VERDAD:** El monitor de calidad en la UI (`DocumentationQualityPanel`) es el único juez de la cobertura real.
2. **SNAPSHOT DINÁMICO:** La IA no debe editar a mano los números en `00-SNAPSHOT.md`.
3. **MÉTRICAS DE COBERTURA:** El sistema escanea TODO el código útil, ignorando archivos temporales o de auditoría.

---

## 🔥 6. PROHIBICIONES ESPECÍFICAS

### **🚨 ESTÁ PROHIBIDO:**
- ❌ Crear documentos en `docs/reconstruction-phase-1/kernel/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/tools/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/runtimes/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/real/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/pillars/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/integration/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/future/`
- ❌ Crear documentos en `docs/reconstruction-phase-1/temp/`
- ❌ Documentar SOLO el frontend sin entender el backend
- ❌ Documentar SOLO el backend sin entender el frontend
- ❌ Crear documentación descontextualizada del sistema completo

### **✅ ÚNICAMENTE PERMITIDO:**
- ✅ `docs/reconstruction-phase-1/exhaustive-mapping/` - ÚNICA CARPETA OFICIAL
- ✅ Documentación con contexto completo del sistema (frontend + backend + integración)

---

## 🎯 7. Flujo de Trabajo Obligatorio

### **Cuando el usuario pida documentación:**
1. **PASO 1:** Verificar que `exhaustive-mapping/` es el lugar correcto
2. **PASO 2:** **ANÁLISIS COMPLETO DEL SISTEMA** - Leer frontend y backend
3. **PASO 3:** Entender las dependencias e integración
4. **PASO 4:** Crear documento en `exhaustive-mapping/` con Frontmatter correcto
5. **PASO 5:** Actualizar `00-INDEX.md`
6. **PASO 6:** Verificar que no haya basura en otras carpetas

### **Si encuentra basura o documentos huérfanos:**
1. **ELIMINARLA** inmediatamente. Un documento es huérfano si el archivo especificado en `location` ya no existe en el código.
2. **REPORTAR** al usuario.
3. **CORREGIR** el procedimiento.

---

## 🚨 8. Consecuencias de No Seguir Este Estándar

### **Para la IA:**
- **Pérdida de tiempo** del usuario (como acaba de suceder)
- **Basura en el sistema** que debe limpiar
- **Confusión** entre documentación oficial y futura
- **Métricas incorrectas** en el UI de monitoreo
- **Documentación inútil** si no entiende el sistema completo

### **Para el Sistema:**
- **Documentación desorganizada**
- **Duplicación de effort**
- **Pérdida de confianza** en la documentación
- **Fallas en el UI** de estadísticas
- **Desconexión** entre frontend y backend en la documentación

---

## 🎯 **REGLA FINAL: exhaustive-mapping/ ES TODO**

**Si no está en `exhaustive-mapping/`, no es documentación oficial.**
**Si creas fuera de `exhaustive-mapping/`, estás cometiendo un error.**
**Si encuentras algo fuera de `exhaustive-mapping/`, es basura que debe eliminarse.**

**¡SIN EXCEPCIONES!**
