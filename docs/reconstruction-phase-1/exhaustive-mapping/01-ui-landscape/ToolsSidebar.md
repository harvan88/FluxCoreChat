---
id: "tools-sidebar"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/tools/ToolsSidebar.tsx"
---

# 🤖 ToolsSidebar

## 🎯 Propósito
El `ToolsSidebar` es el menú lateral dedicado a las utilidades centrales del sistema ("Herramientas"). Sirve como punto de entrada para aplicaciones que se abren en pestañas (Tabs) o que activan vistas globales, como el gestor de plantillas o el asistente de FluxCore.

## 🚀 Funcionalidades Clave

### 🧩 Punto de Descubrimiento de FluxCore (v8.3)
Actúa como la ruta de acceso de respaldo para el Asistente **FluxCore**. 
- **Accesibilidad:** Permite a los usuarios encontrar y abrir el asistente incluso si el icono todavía no es visible en la `ActivityBar` principal.
- **Identidad:** Utiliza el `FluxCoreIcon` oficial para una identificación inmediata.

### 📝 Gestor de Plantillas
Proporciona acceso al panel de edición de plantillas de respuesta, inyectando un nuevo Tab decorado con el `FileTextIcon` en el contenedor central de la aplicación.

### 🚥 Indicador de Estado Activo
Analiza el estado global de la UI (`activeActivity`) y del contenedor enfocado para resaltar visualmente qué herramienta está utilizando el usuario actualmente, proporcionando feedback visual inmediato.

## 🔄 Flujos de Interacción
1. **Selección de FluxCore:** Al seleccionar "Asistente (FluxCore)", dispara la acción `setActiveActivity('ext:@fluxcore/asistentes')`, lo que abre el panel administrativo del asistente.
2. **Apertura de Tab:** Al seleccionar "Plantillas", utiliza el `openTab` del `panelStore` para crear una nueva pestaña persistente.

## 💡 Ejemplo de Uso

```tsx
<ToolsSidebar accountId={currentAccount.id} />
```

## 🏗️ Arquitectura
Es un componente inteligente que conecta múltiples almacenes de datos (`panelStore`, `uiStore`, `useExtensions`) para presentar una navegación de utilidades coherente.
