# Chat Interface Wireframe - Inventario Técnico de Componentes

> **Documento generado**: Análisis de wireframes para desarrollo frontend
> **Fuente**: 13 archivos SVG en `apps/web/src/components/Diseño de chat/`

---

## 1. ESTRUCTURA GENERAL DE LA INTERFAZ

### 1.1 Layout Principal
```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (opcional)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   ÁREA DE MENSAJES                      │
│                   (Chat Messages)                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                   INPUT AREA (Footer)                   │
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

**Icono**: Cara sonriente con signo + (posición: izquierda del input)
**Color inactivo**: `#B0AFBD`
**Color activo**: Destacado

---

#### `AttachmentButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isActive` | `boolean` | Panel de adjuntos abierto |
| `onClick` | `() => void` | Toggle panel adjuntos |

**Icono**: Clip de papel (paperclip)
**Color inactivo**: `#B0AEBD`
**Posición**: Derecha del campo de texto

---

#### `MicrophoneButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isRecording` | `boolean` | Grabando activamente |
| `isPaused` | `boolean` | Grabación pausada |
| `onClick` | `() => void` | Iniciar/pausar grabación |

**Icono**: Micrófono
**Color inactivo**: `#B0AFBD`
**Color grabando**: `#EF0054` (rojo/rosa)
**Posición**: Derecha del botón de adjuntos

---

#### `AIModeButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `mode` | `'off' \| 'automatic' \| 'supervision'` | Modo actual |
| `onClick` | `() => void` | Abrir selector de modo |

**Iconos por modo**:
- **Off**: Robot tachado (`#B0AFBD`)
- **Automático**: Robot con check (`#14D32A` verde)
- **Supervisión**: Burbuja de chat con puntos (`#FF9500` naranja)

**Posición**: Extremo derecho, antes del botón enviar

---

#### `SendButton`
| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `disabled` | `boolean` | Sin contenido para enviar |
| `onClick` | `() => void` | Enviar mensaje |

**Icono**: Flecha hacia arriba
**Color activo**: `#3B82F6` (azul, fondo circular)
**Color inactivo**: Gris
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
- **Fondo**: `#757575` con opacidad 0.5
- **Borde**: `#AEAEAE`
- **Border-radius**: Pill/redondeado (32px+)
- **Texto placeholder**: Visible cuando vacío

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
| Documento | `document` | `#44EFFF` (cyan) | Archivos/documentos |
| Cámara | `camera` | `#0A63E9` (azul) | Tomar foto |
| Galería | `gallery` | `#D30BB1` (magenta) | Imágenes existentes |
| Audio | `audio` | `#CE1499` (rosa) | Notas de voz/audio |
| Recibo | `receipt` | `#E60E0E` (rojo) | Recibos/facturas |
| Ubicación | `location` | `#14D32A` (verde) | Compartir ubicación |
| Quick reply | `quick` | `#FBFF00` (amarillo) | Respuestas rápidas |
| Contacto | `contact` | `#25E7DE` (turquesa) | Compartir contacto |

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
| Supervisión | Burbuja chat | `#FF9500` | "Modo Supervisión" |
| Automático | Robot calendario | `#14D32A` | "FluxCore Automático" |
| Desactivado | Robot tachado | `#B0AFBD` | "Desactivado" |

**Indicador superior**: Barra azul `#3B82F6` (217x5px)

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
- **Indicador grabando**: Punto verde `#1FFF02`
- **Botón pausa**: Dos barras verticales `#EF0054`
- **Botón play** (cuando pausado): Triángulo blanco
- **Botón papelera**: Icono trash para descartar
- **Botón enviar**: Flecha azul `#3B82F6`

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

## 3. SISTEMA DE COLORES

### 3.1 Colores Base (Dark Theme)
| Token | Hex | Uso |
|-------|-----|-----|
| `bg-container` | `#2C2C2C` | Fondo del input area |
| `bg-input` | `#757575` (50% opacity) | Fondo del campo de texto |
| `border-input` | `#AEAEAE` | Borde del campo de texto |
| `text-icon-inactive` | `#B0AFBD` | Iconos inactivos |
| `bg-base` | `#0D0D0D` | Fondo de panels/cards |

### 3.2 Colores de Acción
| Token | Hex | Uso |
|-------|-----|-----|
| `accent-primary` | `#3B82F6` | Botón enviar, indicadores activos |
| `ai-automatic` | `#14D32A` | Modo IA automático |
| `ai-supervision` | `#FF9500` | Modo IA supervisión |
| `recording` | `#EF0054` | Grabación activa |
| `recording-indicator` | `#1FFF02` | Indicador punto verde |

### 3.3 Colores de Adjuntos
| Tipo | Hex |
|------|-----|
| Documento | `#44EFFF` |
| Cámara | `#0A63E9` |
| Galería | `#D30BB1` |
| Audio | `#CE1499` |
| Recibo | `#E60E0E` |
| Ubicación | `#14D32A` |
| Quick Reply | `#FBFF00` |
| Contacto | `#25E7DE` |

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
