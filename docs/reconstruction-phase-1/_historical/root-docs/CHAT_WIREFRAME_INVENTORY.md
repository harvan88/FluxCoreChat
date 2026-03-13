# Chat Interface Wireframe - Inventario Técnico de Componentes

> **Documento generado**: Análisis de wireframes para desarrollo frontend
> **Fuente**: 13 archivos SVG en `apps/web/src/components/Diseño de chat/`

---

## 0. CATÁLOGO DE ACCIONES, ICONOS Y ATAJOS (Wireframe)

| Acción | Icono (lucide) | Atajo de teclado |
|---|---|---|
| Responder (yo) | `reply` | Por definir |
| Responder con IA | `bot` | Por definir |
| Asignar conversación | `at-sign` | Por definir |
| Etiquetar conversación | `tag` | Por definir |
| Buscar en chat | `search` | Por definir |
| Información de contacto | `info` | Por definir |
| Opciones (menú) | `ellipsis-vertical` | Por definir |
| Compartir | `share-2` | Por definir |
| Bloquear | `shield-ban` | Por definir |
| Vaciar chat | `circle-minus` | Por definir |
| Exportar chat | `download` | Por definir |
| Copiar | `copy` | Por definir |
| Reenviar | `forward` | Por definir |
| Destacar | `star` | Por definir |
| Fijar | `pin` | Por definir |
| Bandera (reportar) | `flag` | Por definir |
| Eliminar para mí | `trash-2` | Por definir |
| Seleccionar (modo selección) | `square` | Por definir |
| Resumir con IA | `captions` | Por definir |
| Refinar respuesta | `biceps-flexed` | Por definir |
| Reacción: 👍 | `thumbs-up` | Por definir |
| Reacción: 👎 | `thumbs-down` | Por definir |
| Reacción: emoji | `smile-plus` | Por definir |
| Clip (adjuntar) | `paperclip` | Por definir |
| Micrófono | `mic` | Por definir |
| Pausar grabación | `pause` | Por definir |
| IA apagada | `bot-off` | Por definir |
| IA en supervisión | `bot-message-square` | Por definir |
| IA automática | `bot` | Por definir |
| Cerrar | `x` | Por definir |
| Enviar | `move-up` | Por definir |
| Eliminar caracter | `delete` | Por definir |
| Teclado | `keyboard` | Por definir |
| Recargar (repreguntar a la IA) | `refresh-ccw` | Por definir |
| Navegar izquierda | `chevron-left` | Por definir |
| Navegar derecha | `chevron-right` | Por definir |
| Adjunto: Documento | `file` | Por definir |
| Adjunto: Cámara | `camera` | Por definir |
| Adjunto: Galería | `images` | Por definir |
| Adjunto: Audio | `audio-lines` | Por definir |
| Adjunto: Contacto | `user-round` | Por definir |
| Adjunto: Ubicación | `map-pin` | Por definir |
| Adjunto: Respuesta rápida | `zap` | Por definir |
| Adjunto: Pedido | `receipt-text` | Por definir |

## 1. ESTRUCTURA GENERAL DE LA INTERFAZ

### 1.1 Layout Principal
```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  [←] [Nombre] [+547 12:35] ... [#] [@] [⋮]             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ÁREA DE MENSAJES                                       │
│  ┌─────────────────────────────────┐                   │
│  │ [□] Mensaje recibido            │ ← Checkbox modo   │
│  │     (hover: [😊] [⋮])           │   selección       │
│  └─────────────────────────────────┘                   │
│           ┌─────────────────────────────────┐          │
│           │ Mensaje enviado (humano)    [□] │          │
│           │ (hover: [😊] [⋮])               │          │
│           └─────────────────────────────────┘          │
│           ┌─────────────────────────────────┐          │
│           │ Mensaje IA (borde azul)     [□] │          │
│           │ (hover: [👍] [👎] [⋮])          │          │
│           └─────────────────────────────────┘          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  INPUT AREA (Footer)                                    │
│  [Emoji] [TextField] [Attach] [Mic] [AI Mode] [Send]   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Dimensiones Base (del SVG)
- **Ancho total**: 849px
- **Alto Input Area**: 136px (estado normal)
- **Alto con panel expandido**: 532px (emojis/adjuntos activos)
- **Alto grabación audio**: 189px
- **Alto selector IA**: 275px

---

## 2. INVENTARIO DE COMPONENTES

### 2.0 HEADER DEL CHAT (Frame 10, 15, 16)

#### `ChatHeader`
**Descripción**: Barra superior del chat con información del contacto y acciones

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `contactName` | `string` | Nombre del contacto |
| `contactPhone` | `string` | Teléfono/identificador |
| `timestamp` | `string` | Última actividad (ej: "12:35") |
| `onBack` | `() => void` | Navegar hacia atrás |
| `onOpenTags` | `() => void` | Abrir sistema de etiquetas |
| `onOpenAssign` | `() => void` | Abrir asignación y notificación |
| `onOpenOptions` | `() => void` | Abrir menú de opciones |

**Elementos del Header (izquierda a derecha)**:

| Icono | Acción | Descripción |
|-------|--------|-------------|
| ← (Flecha) | `onBack()` | Volver a la lista de conversaciones |
| Nombre | - | Nombre del contacto ("Cristian") |
| Teléfono | - | Identificador ("+5491126884928") |
| # (Tag) | `onOpenTags()` | Sistema de etiquetas para categorizar |
| @ (Arroba) | `onOpenAssign()` | Asignar y notificar a miembro del workspace |
| ⋮ (Options) | `onOpenOptions()` | Menú desplegable de opciones |

**Colores**:
- **Fondo**: `bg-elevated`
- **Iconos**: `text-muted`
- **Texto nombre**: `text-primary`
- **Texto teléfono**: `text-secondary`

**Interacciones UI (Wireframe) - # / @ / /buscar**

##### `TagSelectorPopover` (#)
**Descripción**: Popover inline para filtrar/crear etiquetas de conversación.

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Popover visible |
| `query` | `string` | Texto con prefijo `#` (ej: `#Int`) |
| `selectedTagIds` | `string[]` | Tags aplicadas a la conversación |
| `onToggleTag` | `(tagId: string) => void` | Aplicar/quitar tag |
| `onCreateTag` | `(name: string) => void` | Crear nueva etiqueta |
| `onClose` | `() => void` | Cerrar popover |

**Wireframe sugiere**:
- Input inline con prefijo `#`.
- Dropdown con tags existentes + acción `Nueva etiqueta`.
- Render de chips/pills (ej: `Interesado`) en el header.
- Fuente de tags: **tags del workspace + tags de la cuenta** (herencia). En conflictos de nombre, prevalece workspace.

##### `AssignmentAccessPopover` (@)
**Descripción**: Popover inline para **asignación + notificación** relacionado a la conversación (**no otorga permisos**).

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Popover visible |
| `query` | `string` | Texto con prefijo `@` (ej: `@marimar`) |
| `scope` | `'full' \| 'selected'` | Alcance wireframe: `acceso completo` vs `acceso a seleccionados` (workflow) |
| `onSelectAssignee` | `(userId: string) => void` | Elegir miembro del workspace (`workspace_members.user_id`) |
| `onChangeScope` | `(scope: 'full' | 'selected') => void` | Cambiar alcance |
| `onClose` | `() => void` | Cerrar popover |

**Wireframe sugiere**:
- Input inline con `@usuario` + sufijo tipo comando (ej: `/ac`).
- Dropdown con opciones de alcance: `acceso completo` / `acceso a seleccionados`.
- Semántica adoptada:
  - `full`: asigna la conversación completa al miembro + notifica.
  - `selected`: notifica/dirige a **mensajes seleccionados** (PC-10) sin cambios de permisos.

##### `ConversationSearchBar` (/buscar)
**Descripción**: Barra inline para búsqueda dentro de la conversación, con sintaxis tipo comando.

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Búsqueda visible |
| `query` | `string` | Texto con prefijo `/buscar` (ej: `/buscar precio`) |
| `activeMatchIndex` | `number` | Match activo (0-based) |
| `matchesCount` | `number` | Total de matches |
| `onPrevMatch` | `() => void` | Ir al match anterior |
| `onNextMatch` | `() => void` | Ir al match siguiente |
| `onClose` | `() => void` | Cerrar búsqueda |

**Wireframe sugiere**:
- Contador `1/2` + controles navegación (prev/next).
- Dropdown de sugerencias/recientes (por definir fuente).

---

### 2.0.1 MENÚ DE OPCIONES DEL HEADER (Sidebar Derecho)

#### `ChatOptionsMenu`
**Descripción**: Panel lateral con opciones de conversación (visible en Frame 10, 15)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Panel visible |
| `onClose` | `() => void` | Cerrar panel |
| `onAction` | `(action: string) => void` | Ejecutar acción |

**Opciones del Menú** (icono izquierda, texto derecha):

| Icono | Acción | Descripción |
|-------|--------|-------------|
| ↩️ Reenviar | `forward` | Reenviar conversación |
| 📅 Calendario | `schedule` | Programar mensaje/recordatorio |
| @ Mención | `mention` | Mencionar otra cuenta |
| # Tag | `tag` | Etiquetar conversación |
| 🛡️ Seguridad | `security` | Configuración de privacidad |
| 🔍 Buscar | `search` | Buscar en conversación |
| ⬇️ Descargar | `download` | Descargar conversación/archivos |
| 🚫 Bloquear | `block` | Bloquear contacto |
| 📤 Compartir | `share` | Compartir conversación |
| 🗑️ Eliminar | `delete` | Eliminar conversación |

**Estilos**:
- **Fondo panel**: `bg-elevated`
- **Items hover**: `bg-hover`
- **Iconos**: `text-muted`
- **Texto**: `text-primary`

---

### 2.0.2 BURBUJAS DE MENSAJE

#### `MessageBubble`
**Descripción**: Contenedor de mensaje individual con estados según origen

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` | ID del mensaje |
| `content` | `MessageContent` | Contenido del mensaje |
| `sender` | `'self' \| 'other' \| 'ai'` | Origen del mensaje |
| `generatedBy` | `'human' \| 'ai'` | Generado por humano o IA |
| `timestamp` | `string` | Hora del mensaje |
| `isSelected` | `boolean` | Seleccionado (modo selección) |
| `onSelect` | `() => void` | Toggle selección |

**Estilos por tipo**:

| Tipo | Fondo | Borde | Alineación |
|------|-------|-------|------------|
| Recibido (otro) | `bg-elevated` | Ninguno | Izquierda |
| Enviado (self, humano) | `bg-elevated` | Ninguno | Derecha |
| Enviado (self, IA) | `bg-surface` | `border-accent` 2px | Derecha |

---

### 2.0.3 MENÚ HOVER EN MENSAJES

#### `MessageHoverMenu`
**Descripción**: Menú contextual que aparece al pasar el mouse sobre un mensaje

**Para mensajes HUMANOS (enviados o recibidos)**:

| Icono | Acción | Descripción |
|-------|--------|-------------|
| 😊 Emoji | `react` | Agregar reacción emoji |
| ⋮ Options | `openMenu` | Abrir menú de opciones |

**Para mensajes generados por IA** (burbuja azul):

| Icono | Acción | Descripción |
|-------|--------|-------------|
| 👍 Thumbs Up | `feedback:positive` | Feedback positivo a la IA |
| 👎 Thumbs Down | `feedback:negative` | Feedback negativo a la IA |
| ⋮ Options | `openMenu` | Abrir menú de opciones (incluye "Refinar") |

**Menú de Opciones del Mensaje** (al hacer click en ⋮):

| Opción | Acción | Solo IA |
|--------|--------|---------|
| Responder | `reply` | No |
| Copiar | `copy` | No |
| Reenviar | `forward` | No |
| Marcar | `flag` | No |
| Eliminar | `delete` | No |
| **Refinar** | `refine` | **Sí** |

---

### 2.0.4 INTERFAZ DE REFINACIÓN DE IA

#### `AIRefinementPanel`
**Descripción**: Panel que transforma la burbuja de mensaje IA para recibir observaciones

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `messageId` | `string` | ID del mensaje a refinar |
| `originalContent` | `string` | Contenido original del mensaje |
| `onSubmit` | `(observation: string) => void` | Enviar observación |
| `onCancel` | `() => void` | Cancelar refinación |

**Estructura visual**:
```
┌─────────────────────────────────────────┐
│ Mensaje original de IA                  │
├─────────────────────────────────────────┤
│ [Título: "Observación de refinación"]   │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │  Textarea para escribir             │ │
│ │  la observación...                  │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│           [Cancelar] [Enviar]           │
└─────────────────────────────────────────┘
```

**Flujo**:
1. Usuario hace click en "Refinar" en menú del mensaje IA
2. La burbuja se expande mostrando el panel de refinación
3. Usuario escribe observación
4. Al enviar, se genera nuevo mensaje con las correcciones
5. Al cancelar, vuelve al estado normal

---

### 2.0.5 CHECKBOX DE SELECCIÓN (Modo Selección)

#### `MessageSelectionCheckbox`
**Descripción**: Checkbox que aparece junto a cada mensaje en modo selección

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isSelected` | `boolean` | Estado de selección |
| `onChange` | `() => void` | Toggle selección |

**Posición**: Izquierda del mensaje (mensajes recibidos) o derecha (mensajes enviados)
**Icono**: Cuadrado con check cuando seleccionado
**Color seleccionado**: `text-accent`

---

### 2.1 INPUT AREA - Componente Principal

#### `ChatInputBar`
**Descripción**: Barra de entrada de mensajes con múltiples estados y acciones

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `mode` | `'default' \| 'typing' \| 'recording' \| 'paused' \| 'selecting'` | Estado actual del input |
| `aiMode` | `'off' \| 'automatic' \| 'supervision'` | Modo de IA activo |
| `hasText` | `boolean` | Si hay texto escrito |
| `isPanelOpen` | `'none' \| 'emoji' \| 'attachments' \| 'ai-selector'` | Panel expandido actual |

**Estados Identificados**:
1. **Por defecto** (`Imput por defecto.svg`)
2. **Activo para escribir** (`Imputa por defecto cuando se activa para escribir.svg`)
3. **IA en automático** (`Imput IA en automático.svg`)
4. **IA en supervisión** (`Imput IA en supervisión.svg`)
5. **Panel emojis activo** (`imput cuando emojis está activo.svg`)
6. **Panel adjuntos activo** (`Imput cuando clip de adjuntos está activo.svg`)
7. **Grabación audio activa** (`Imput cuando la gración de audio está activa.svg`)
8. **Grabación audio pausada** (`Imput cuando la gración de audio está pausada.svg`)
9. **Mensajes seleccionados** (`Imput cuando mensajes seleccionado esta activo.svg`)

---

### 2.2 ICONOS/BOTONES DE ACCIÓN

#### `EmojiButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isActive` | `boolean` | Panel de emojis abierto |
| `onClick` | `() => void` | Toggle panel emojis |

**Icono**: Cara sonriente con signo (posición: izquierda del input)
**Color inactivo**: `text-muted`
**Color activo**: `text-accent`

---

#### `AttachmentButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isActive` | `boolean` | Panel de adjuntos abierto |
| `onClick` | `() => void` | Toggle panel adjuntos |

**Icono**: Clip de papel (paperclip)
**Color inactivo**: `text-muted`
**Posición**: Derecha del campo de texto

---

#### `MicrophoneButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isRecording` | `boolean` | Grabando activamente |
| `isPaused` | `boolean` | Grabación pausada |
| `onClick` | `() => void` | Iniciar/pausar grabación |

**Icono**: Micrófono
**Color inactivo**: `text-muted`
**Color grabando**: `text-error`
**Posición**: Derecha del botón de adjuntos

---

#### `AIModeButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `mode` | `'off' \| 'automatic' \| 'supervision'` | Modo actual |
| `onClick` | `() => void` | Abrir selector de modo |

**Iconos por modo**:
- **Off**: Robot tachado (`text-muted`)
- **Automático**: Robot con check (`text-success`)
- **Supervisión**: Burbuja de chat con puntos (`text-warning`)

**Posición**: Extremo derecho, antes del botón enviar

---

#### `SendButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `disabled` | `boolean` | Sin contenido para enviar |
| `onClick` | `() => void` | Enviar mensaje |

**Icono**: Flecha hacia arriba
**Color activo**: `bg-accent`
**Color inactivo**: `text-muted`
**Posición**: Extremo derecho

---

### 2.3 CAMPO DE TEXTO

#### `MessageTextField`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | `string` | Texto actual |
| `placeholder` | `string` | Texto placeholder |
| `isFocused` | `boolean` | Campo enfocado |
| `onChange` | `(value: string) => void` | Cambio de texto |
| `onFocus` | `() => void` | Al enfocar |
| `onBlur` | `() => void` | Al desenfocar |

**Estilos**:
- **Fondo**: `bg-elevated` con opacidad reducida
- **Borde**: `border-default`
- **Border-radius**: `rounded-full` (32px+)
- **Texto placeholder**: `text-muted` cuando está vacío

---

### 2.4 PANEL DE EMOJIS

#### `EmojiPanel`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Panel visible |
| `onSelect` | `(emoji: string) => void` | Emoji seleccionado |
| `onClose` | `() => void` | Cerrar panel |

**Estructura interna**:
- Grid de emojis (12 columnas x 5 filas visibles)
- Tabs de categorías: "Emoji", "Stickers", "GIF"
- Barra de búsqueda
- Botón cerrar (X con backspace icon)

**Dimensiones panel**: ~396px alto adicional

---

### 2.5 PANEL DE ADJUNTOS

#### `AttachmentPanel`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Panel visible |
| `onSelect` | `(type: AttachmentType) => void` | Tipo seleccionado |
| `onClose` | `() => void` | Cerrar panel |

**Tipos de adjuntos identificados** (grid 4x2):

| Icono | Tipo | Color | Descripción |
|-------|------|-------|-------------|
| Documento | `document` | `text-info` | Archivos/documentos |
| Cámara | `camera` | `text-accent` | Tomar foto |
| Galería | `gallery` | `text-error` | Imágenes existentes |
| Audio | `audio` | `text-error` | Notas de voz/audio |
| Recibo | `receipt` | `text-error` | Recibos/facturas |
| Ubicación | `location` | `text-success` | Compartir ubicación |
| Quick reply | `quick` | `text-warning` | Respuestas rápidas |
| Contacto | `contact` | `text-info` | Compartir contacto |

**Estructura**: 
- 8 botones en grid 4x2
- Cada botón: rectángulo redondeado (103x99px) con icono + label

---

### 2.6 SELECTOR DE MODO IA

#### `AIModeSelector`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isOpen` | `boolean` | Selector visible |
| `currentMode` | `'off' \| 'automatic' \| 'supervision'` | Modo actual |
| `onSelect` | `(mode: AIMode) => void` | Modo seleccionado |
| `onClose` | `() => void` | Cerrar selector |

**Opciones** (3 cards horizontales):

| Modo | Icono | Color | Label |
|------|-------|-------|-------|
| Supervisión | Burbuja chat | `text-warning` | "Modo Supervisión" |
| Automático | Robot calendario | `text-success` | "FluxCore Automático" |
| Desactivado | Robot tachado | `text-muted` | "Desactivado" |

**Indicador superior**: Barra `bg-accent`

---

### 2.7 INTERFAZ DE GRABACIÓN DE AUDIO

#### `AudioRecordingInterface`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isRecording` | `boolean` | Grabación activa |
| `isPaused` | `boolean` | Grabación pausada |
| `duration` | `string` | Tiempo transcurrido (ej: "0:32") |
| `onPause` | `() => void` | Pausar grabación |
| `onResume` | `() => void` | Reanudar grabación |
| `onStop` | `() => void` | Detener y descartar |
| `onSend` | `() => void` | Enviar audio |

**Elementos visuales**:
- **Waveform**: Visualización de ondas de audio (barras verticales)
- **Timer**: Contador de tiempo (`0:32` format)
- **Indicador grabando**: Punto `text-success`
- **Botón pausa**: Dos barras verticales `text-error`
- **Botón play** (cuando pausado): Triángulo `text-inverse`
- **Botón papelera**: Icono trash `text-muted`
- **Botón enviar**: Flecha `bg-accent`

---

### 2.8 BARRA DE ACCIONES (MENSAJES SELECCIONADOS)

#### `MessageSelectionBar`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `selectedCount` | `number` | Cantidad seleccionada |
| `onClose` | `() => void` | Cancelar selección |
| `onForward` | `() => void` | Reenviar mensajes |
| `onCopy` | `() => void` | Copiar mensajes |
| `onFlag` | `() => void` | Marcar mensajes |
| `onDownload` | `() => void` | Descargar adjuntos |
| `onDelete` | `() => void` | Eliminar mensajes |

**Layout**: `[X] [Count] .... [Forward] [Copy] [Flag] [Download] [Delete]`

**Iconos**:
- **Cerrar (X)**: Cancelar selección
- **Contador**: "3 mensajes seleccionados"
- **Forward**: Flecha curva derecha
- **Copy**: Dos rectángulos superpuestos
- **Flag**: Bandera
- **Download**: Flecha abajo con línea
- **Delete**: Papelera

---

## 3. SISTEMA DE COLORES CANÓNICO

### 3.1 Tokens de Color (Tema Oscuro)
| Token | Variable CSS | Uso en Componentes |
|-------|-------------|-------------------|
| `bg-base` | `var(--bg-base)` | Fondo principal de la aplicación |
| `bg-surface` | `var(--bg-surface)` | Contenedores, paneles principales |
| `bg-elevated` | `var(--bg-elevated)` | Inputs, cards, elementos elevados |
| `bg-hover` | `var(--bg-hover)` | Estados hover interactivos |
| `bg-active` | `var(--bg-active)` | Estados activos/seleccionados |
| `border-subtle` | `var(--border-subtle)` | Bordes sutiles de bajo contraste |
| `border-default` | `var(--border-default)` | Bordes estándar |
| `text-primary` | `var(--text-primary)` | Texto principal |
| `text-secondary` | `var(--text-secondary)` | Texto secundario |
| `text-muted` | `var(--text-muted)` | Iconos inactivos, placeholders |
| `text-inverse` | `var(--text-inverse)` | Texto sobre fondos accent |

### 3.2 Colores Semánticos
| Token | Variable CSS | Uso |
|-------|-------------|-----|
| `bg-accent` | `var(--accent-primary)` | Botones activos, elementos importantes |
| `text-accent` | `var(--accent-primary)` | Iconos activos, texto destacado |
| `text-success` | `var(--color-success)` | Estados exitosos, ubicación, IA automático |
| `text-warning` | `var(--color-warning)` | Estados de advertencia, IA supervisión |
| `text-error` | `var(--color-error)` | Estados de error, grabación activa |
| `text-info` | `var(--color-info)` | Información, documentos, contactos |

### 3.3 Regla de Botones
- **Inactivos**: `var(--text-muted)` (gris semántico)
- **Activos/Importantes**: `var(--bg-accent)` (azul principal)
- **Semánticos**: Usar tokens semánticos (`text-success`, `text-warning`, `text-error`, `text-info`)

---

## 4. ESTADOS Y TRANSICIONES

### 4.1 Diagrama de Estados del Input

```
                    ┌──────────────┐
                    │   DEFAULT    │
                    │  (idle)      │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  TYPING  │    │ RECORDING│    │ SELECTING│
    │          │    │          │    │          │
    └────┬─────┘    └────┬─────┘    └──────────┘
         │               │
         │               ▼
         │          ┌──────────┐
         │          │  PAUSED  │
         │          │          │
         │          └──────────┘
         │
         ▼
    ┌──────────┐
    │  SENT    │
    └──────────┘
```

### 4.2 Estados de Paneles

| Panel | Trigger | Cierre |
|-------|---------|--------|
| Emoji | Click en EmojiButton | Click fuera, selección, X |
| Attachments | Click en AttachmentButton | Click fuera, selección |
| AI Selector | Click en AIModeButton | Click fuera, selección |

---

## 5. INTERACCIONES CLAVE

### 5.1 Envío de Mensaje
1. Usuario escribe texto → `hasText = true`
2. Botón enviar se activa (azul)
3. Click/Enter → `onSend()`
4. Input se limpia → `hasText = false`

### 5.2 Grabación de Audio
1. Click en micrófono → Estado `recording`
2. Waveform se muestra
3. Click pause → Estado `paused`
4. Click play → Resume recording
5. Click trash → Descartar
6. Click send → Enviar audio

### 5.3 Selección de Mensajes
1. Long-press en mensaje → Modo selección activo
2. MessageSelectionBar aparece
3. Tap adicional → Toggle selección
4. Acciones disponibles según selección
5. Click X → Salir modo selección

### 5.4 Cambio de Modo IA
1. Click en AIModeButton
2. Selector aparece (3 opciones)
3. Selección cambia icono/color del botón
4. Panel se cierra automáticamente

---

## 6. COMPONENTES REACT SUGERIDOS

```
ChatInputArea/
├── ChatInputBar.tsx           # Componente contenedor principal
├── MessageTextField.tsx       # Campo de texto
├── EmojiButton.tsx           # Botón emoji
├── AttachmentButton.tsx      # Botón adjuntos
├── MicrophoneButton.tsx      # Botón micrófono
├── AIModeButton.tsx          # Botón modo IA
├── SendButton.tsx            # Botón enviar
├── EmojiPanel.tsx            # Panel de emojis
├── AttachmentPanel.tsx       # Panel de adjuntos
├── AIModeSelector.tsx        # Selector de modo IA
├── AudioRecordingInterface.tsx # UI de grabación
├── MessageSelectionBar.tsx   # Barra de selección
└── index.ts                  # Exports
```

---

## 7. HOOKS SUGERIDOS

```typescript
// useInputState.ts
interface InputState {
  mode: 'default' | 'typing' | 'recording' | 'paused' | 'selecting';
  text: string;
  aiMode: 'off' | 'automatic' | 'supervision';
  openPanel: 'none' | 'emoji' | 'attachments' | 'ai-selector';
  selectedMessages: string[];
  recordingDuration: number;
}

// useAudioRecording.ts
interface AudioRecording {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  send: () => Promise<void>;
}

// useMessageSelection.ts
interface MessageSelection {
  isSelecting: boolean;
  selectedIds: string[];
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  forward: () => void;
  copy: () => void;
  delete: () => void;
}
```

---

## 8. PRÓXIMOS PASOS

1. **Revisar backend existente** contra este inventario
2. **Identificar gaps** de funcionalidad
3. **Mapear endpoints** necesarios
4. **Crear relaciones** backend-frontend

---

*Documento generado para FluxCoreChat - Análisis de Wireframes*
