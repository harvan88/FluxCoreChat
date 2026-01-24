# Arquitectura de Extensiones UI (Slot Pattern) - Hito 4

> **Objetivo:** Desacoplar visualmente FluxCore del CoreChat, permitiendo que la extensión "inyecte" sus controles sin que el Core tenga dependencias duras.

## 1. Concepto Fundamental
El Frontend debe replicar la modularidad del Backend. El "Core Chat" (el chasis) provee lugares vacíos (**Slots**) donde las extensiones (el motor/piloto) pueden montar sus propios componentes de interfaz.

## 2. Nuevos Primitivos

### 2.1. `ExtensionRegistry`
Un almacén central (probablemente un React Context o un Store de Zustand) que mapea:
`SlotName -> Array<ExtensionComponent>`

### 2.2. `<ExtensionSlot name="..." context={...} />`
Un componente React "tonto" que el Core coloca en lugares estratégicos.
Su trabajo es:
1. Consultar al Registry por componentes registrados para ese `name`.
2. Renderizarlos pasando el `context` (ej. `conversationId`, `messageId`).

## 3. Slots Identificados

| Slot Name | Ubicación | Uso en FluxCore |
|-----------|-----------|-----------------|
| `composer.actions.primary` | Área de envío de mensaje | Botón "Varita Mágica" / Selector de Modo (Auto/Supervisado) |
| `composer.actions.secondary` | Menú de adjuntos | Subida de archivos a Vector Store |
| `message.footer` | Debajo de una burbuja de mensaje | Botones de Feedback, Regenerar, Debug Info |
| `sidebar.conversation.item` | Lista de chats | Indicador de "IA Activa" o estado |
| `settings.tabs` | Modal de Configuración | Pestaña "FluxCore AI" |

## 4. Plan de Implementación (Hito 4)

### Fase 4.1: Infraestructura (The Glue)
- Crear `apps/web/src/modules/extensions/ExtensionRegistry.ts`.
- Crear componente `<ExtensionSlot />`.
- Configurar el `ExtensionProvider` en la raíz de la app.

### Fase 4.2: Definición del Plugin FluxCore
- Crear `apps/web/src/extensions/fluxcore/index.tsx`.
- Este archivo debe exportar una función `register()` que llama a `registry.register('composer.actions.primary', AutomationControls)`.

### Fase 4.3: Refactorización "Surgical" (Extirpación)
- Ir a `ChatComposer.tsx`.
- **Eliminar** importaciones directas de `useAutomation`, `AutomationButton`, etc.
- **Insertar** `<ExtensionSlot name="composer.actions.primary" />`.
- Verificar que la funcionalidad se mantiene intacta pero ahora es inyectada.

## 5. Beneficio
Si mañana creas una extensión "GomeríaCRM", podrás inyectar un botón "Crear Presupuesto" en el mismo slot sin tocar el código del chat.
