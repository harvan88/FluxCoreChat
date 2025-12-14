# Chat Wireframe - Auditoría y Resumen Ejecutivo

> **Fecha**: Generado automáticamente
> **Documentos relacionados**:
> - `CHAT_WIREFRAME_INVENTORY.md` - Inventario técnico de componentes
> - `CHAT_BACKEND_FRONTEND_MAPPING.md` - Mapeo backend-frontend

---

## 1. RESUMEN EJECUTIVO

### 1.1 Alcance del Análisis
Se analizaron **13 archivos SVG** del diseño de chat ubicados en:
`apps/web/src/components/Diseño de chat/`

### 1.2 Componentes Identificados

| Categoría | Componentes | Estados |
|-----------|-------------|---------|
| Input Area | 1 principal | 9 estados diferentes |
| Botones de Acción | 6 | Múltiples estados activo/inactivo |
| Paneles Expandibles | 3 | Emoji, Adjuntos, Selector IA |
| Interfaces Especiales | 2 | Grabación Audio, Selección Mensajes |

### 1.3 Cobertura Backend

| Métrica | Valor |
|---------|-------|
| Funcionalidades con soporte completo | 12 |
| Funcionalidades con soporte parcial | 3 |
| Gaps identificados | 14 |
| Gaps críticos (prioridad alta) | 5 |

---

## 2. COMPONENTES FRONTEND REQUERIDOS

### 2.1 Estructura de Componentes Propuesta

```
apps/web/src/components/chat/
├── ChatInputArea/
│   ├── ChatInputBar.tsx           # Contenedor principal
│   ├── MessageTextField.tsx       # Campo de texto
│   ├── ActionButtons/
│   │   ├── EmojiButton.tsx
│   │   ├── AttachmentButton.tsx
│   │   ├── MicrophoneButton.tsx
│   │   ├── AIModeButton.tsx
│   │   └── SendButton.tsx
│   ├── Panels/
│   │   ├── EmojiPanel.tsx
│   │   ├── AttachmentPanel.tsx
│   │   └── AIModeSelector.tsx
│   ├── AudioRecordingInterface.tsx
│   ├── MessageSelectionBar.tsx
│   └── index.ts
├── hooks/
│   ├── useInputState.ts
│   ├── useAudioRecording.ts
│   ├── useMessageSelection.ts
│   └── useAIMode.ts
└── types/
    └── chat-input.types.ts
```

### 2.2 Estados del Input (State Machine)

```
┌─────────────────────────────────────────────────────────────┐
│                         ESTADOS                              │
├─────────────────────────────────────────────────────────────┤
│  DEFAULT → TYPING → SENT                                    │
│     ↓                                                        │
│  RECORDING → PAUSED → SENT/DISCARDED                        │
│     ↓                                                        │
│  SELECTING → (acciones) → DEFAULT                           │
├─────────────────────────────────────────────────────────────┤
│                      PANELES                                 │
├─────────────────────────────────────────────────────────────┤
│  NONE ←→ EMOJI ←→ ATTACHMENTS ←→ AI_SELECTOR               │
├─────────────────────────────────────────────────────────────┤
│                    MODOS IA                                  │
├─────────────────────────────────────────────────────────────┤
│  OFF ←→ AUTOMATIC ←→ SUPERVISED                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ANÁLISIS DE GAPS

### 3.1 Gaps de Alta Prioridad (Bloquean desarrollo)

| ID | Descripción | Impacto | Esfuerzo Est. |
|----|-------------|---------|---------------|
| G-01 | Upload de archivos genérico | AttachmentPanel inutilizable | 4h |
| G-02 | Upload de audio/voz | AudioRecording inutilizable | 4h |
| G-03 | Indicador "escribiendo" | UX incompleta | 2h |
| G-04 | Forward de mensajes | Selección limitada | 3h |
| G-05 | Batch delete mensajes | Selección limitada | 2h |

**Total estimado gaps alta prioridad: ~15h desarrollo backend**

### 3.2 Gaps de Media Prioridad

| ID | Descripción | Impacto | Esfuerzo Est. |
|----|-------------|---------|---------------|
| G-06 | Flag/Bookmark mensajes | Feature incompleto | 2h |
| G-07 | Compartir ubicación | Feature incompleto | 3h |
| G-08 | Compartir contacto | Feature incompleto | 3h |
| G-09 | Read receipts | UX incompleta | 3h |
| G-10 | Presence online/offline | UX incompleta | 4h |

**Total estimado gaps media prioridad: ~15h desarrollo backend**

### 3.3 Gaps de Baja Prioridad

| ID | Descripción | Impacto | Esfuerzo Est. |
|----|-------------|---------|---------------|
| G-11 | Catálogo stickers | Nice-to-have | 8h |
| G-12 | Integración GIFs | Nice-to-have | 4h |
| G-13 | Quick replies CRUD | Nice-to-have | 4h |
| G-14 | Transcripción audio | Nice-to-have | 8h |

**Total estimado gaps baja prioridad: ~24h desarrollo**

---

## 4. FUNCIONALIDADES YA SOPORTADAS

### 4.1 Backend Listo para Frontend

| Funcionalidad | Endpoint | WebSocket | Notas |
|---------------|----------|-----------|-------|
| Enviar mensaje texto | ✅ POST /messages | ✅ message | Completo |
| Historial mensajes | ✅ GET /conversations/:id/messages | - | Con paginación |
| Crear conversación | ✅ POST /conversations | - | Completo |
| Listar conversaciones | ✅ GET /conversations | - | Con enriquecimiento |
| Obtener modo IA | ✅ GET /automation/mode/:accountId | - | Completo |
| Cambiar modo IA | ✅ POST /automation/rules | - | Completo |
| Solicitar sugerencia IA | - | ✅ request_suggestion | Completo |
| Aprobar sugerencia | - | ✅ approve_suggestion | Completo |
| Descartar sugerencia | - | ✅ discard_suggestion | Completo |
| Subscribe a relación | - | ✅ subscribe | Completo |
| Nuevo mensaje (realtime) | - | ✅ message:new | Completo |
| Upload avatar | ✅ POST /upload/avatar | - | Solo avatares |

---

## 5. RECOMENDACIONES DE IMPLEMENTACIÓN

### 5.1 Fase 1: Core Chat Input (1-2 sprints)

**Objetivo**: Input funcional básico con texto y modos IA

1. Implementar `ChatInputBar` con estados básicos
2. Integrar `MessageTextField` con WebSocket
3. Implementar `AIModeButton` + `AIModeSelector`
4. Integrar sugerencias IA en modo supervised
5. Implementar `SendButton` con estados

**Backend requerido**: Todo disponible ✅

### 5.2 Fase 2: Adjuntos Básicos (1-2 sprints)

**Objetivo**: Subir imágenes y documentos

1. **BACKEND**: Crear `POST /upload/file` genérico
2. Implementar `AttachmentButton` + `AttachmentPanel`
3. Integrar upload con mensajes
4. Mostrar previews de media en mensajes

**Backend requerido**: G-01 (4h)

### 5.3 Fase 3: Audio (1 sprint)

**Objetivo**: Notas de voz funcionales

1. **BACKEND**: Crear `POST /upload/audio`
2. Implementar `MicrophoneButton`
3. Implementar `AudioRecordingInterface`
4. Integrar waveform visualization
5. Reproducción de audio en mensajes

**Backend requerido**: G-02 (4h)

### 5.4 Fase 4: UX Enhancements (1 sprint)

**Objetivo**: Indicadores de estado

1. **BACKEND**: Agregar WS event `typing`
2. Implementar typing indicator
3. **BACKEND**: Agregar read receipts
4. Mostrar checks de lectura
5. Implementar `EmojiButton` + `EmojiPanel`

**Backend requerido**: G-03, G-09 (5h)

### 5.5 Fase 5: Selección de Mensajes (1 sprint)

**Objetivo**: Acciones batch sobre mensajes

1. **BACKEND**: Forward, batch delete, flag
2. Implementar modo selección
3. Implementar `MessageSelectionBar`
4. Integrar acciones con backend

**Backend requerido**: G-04, G-05, G-06 (7h)

---

## 6. SISTEMA DE COLORES (Referencia Rápida)

### Tokens del Wireframe → Sistema de Diseño

| Wireframe Color | Uso | Token Sugerido |
|-----------------|-----|----------------|
| `#2C2C2C` | Fondo container | `bg-elevated` |
| `#757575` | Fondo input | `bg-surface` + opacity |
| `#AEAEAE` | Bordes | `border-default` |
| `#B0AFBD` | Iconos inactivos | `text-muted` |
| `#0D0D0D` | Fondo panels | `bg-base` |
| `#3B82F6` | Accent/Enviar | `accent-primary` |
| `#14D32A` | IA Automático | `ai-automatic` (nuevo) |
| `#FF9500` | IA Supervisión | `ai-supervision` (nuevo) |
| `#EF0054` | Grabación | `recording` (nuevo) |

---

## 7. ARCHIVOS DE DISEÑO ANALIZADOS

| Archivo | Descripción | Componentes Clave |
|---------|-------------|-------------------|
| `Frame 10.svg` | Layout principal chat | Header, Messages, Footer |
| `Frame 15.svg` | Chat con mensajes | Burbujas, Sidebar |
| `Frame 16.svg` | Variación con input | Input states |
| `Imput por defecto.svg` | Input estado idle | Todos los iconos |
| `Imputa por defecto cuando se activa para escribir.svg` | Input typing | Send button activo |
| `Imput IA en automático.svg` | Modo IA auto | Icono verde |
| `Imput IA en supervisión.svg` | Modo IA supervised | Icono naranja |
| `imput cuando emojis está activo.svg` | Panel emojis | Grid emojis, tabs |
| `Imput cuando clip de adjuntos está activo.svg` | Panel adjuntos | 8 tipos de adjuntos |
| `Imput cuando la gración de audio está activa.svg` | Grabando | Waveform, pause |
| `Imput cuando la gración de audio está pausada.svg` | Pausado | Play, waveform |
| `Imput cuando mensajes seleccionado esta activo.svg` | Selección | Barra de acciones |
| `selecion modo IA.svg` | Selector IA | 3 opciones |

---

## 8. CONCLUSIONES

### ✅ Fortalezas del Backend Actual
- Sistema de mensajería robusto con WebSocket
- Modos de IA completamente implementados
- Arquitectura extensible via ExtensionHost
- Flujo de sugerencias IA funcional

### ⚠️ Áreas de Mejora
- Upload de archivos limitado a avatares
- Sin soporte para media en mensajes
- Sin indicadores de estado en tiempo real (typing, presence)
- Sin acciones batch sobre mensajes
- Sin sistema de tags (#), asignación (@) ni búsqueda en conversación (UI tipo `/buscar`) en el header
- Sin acciones avanzadas del header (bloqueo de contactos, export)

### 📋 Siguiente Paso Recomendado
Implementar **G-01 (Upload genérico)** ya que desbloquea la mayor cantidad de funcionalidad del wireframe con el menor esfuerzo.

---

*Auditoría completada - FluxCoreChat Chat Interface Wireframe Analysis*
