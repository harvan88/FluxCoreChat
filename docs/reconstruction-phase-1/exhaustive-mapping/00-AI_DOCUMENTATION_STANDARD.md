---
id: "ai-documentation-standard"
type: "core"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/00-AI_DOCUMENTATION_STANDARD.md"
---

# 🤖 Estándar de Documentación para IA (FluxCore)

**Ubicación:** `docs/reconstruction-phase-1/exhaustive-mapping/00-AI_DOCUMENTATION_STANDARD.md`
**Propósito:** Reglas ESTRICTAS y deterministas sobre cómo cualquier IA debe crear, actualizar o evaluar la documentación en el sistema FluxCore.
**Estado:** ✅ STABLE

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
├── 00-AI_DOCUMENTATION_STANDARD.md    # Este estándar
├── 00-documentation-index.md           # Índice maestro
├── 01-ui-landscape/                    # Componentes UI
├── 02-backend-landscape/               # Componentes backend
├── 03-database-landscape/             # Base de datos
└── [demás carpetas del sistema]
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

## 🔥 9. Protocolo de Revisión del Sistema (NUEVO)

### **OBLIGATORIO ANTES DE DOCUMENTAR:**
La IA DEBE analizar tanto el frontend como el backend del sistema para entender la arquitectura completa:

1. **FRONTEND:** Revisar `apps/web/src/components/` para entender la UI
2. **BACKEND:** Revisar `apps/api/src/services/`, `routes/`, `core/` para entender la lógica
3. **INTEGRACIÓN:** Entender cómo se conectan frontend y backend
4. **DOCUMENTACIÓN EXISTENTE:** Leer los documentos ya existentes para no duplicar

### **¿POR QUÉ ESTA REGLA?**
- Evita documentación incompleta o descontextualizada
- Permite entender las dependencias reales
- Garantiza que la documentación sea útil para desarrolladores
- Previene errores de arquitectura en la documentación

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
5. **PASO 5:** Actualizar `00-documentation-index.md`
6. **PASO 6:** Verificar que no haya basura en otras carpetas

### **Si encuentra basura:**
1. **ELIMINARLA** inmediatamente
2. **REPORTAR** al usuario
3. **CORREGIR** el procedimiento

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
