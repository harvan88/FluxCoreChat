---
id: "fluxcore-sidebar"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/FluxCoreSidebar.tsx"
---

# 🤖 FluxCoreSidebar

## 🎯 Propósito
El `FluxCoreSidebar` es el menú de navegación principal de la consola administrativa de FluxCore. Proporciona acceso a todas las configuraciones del asistente (Dashboard, Instrucciones, Base de Conocimiento, Fluxi, etc.) y actúa como el panel de control de visibilidad de la extensión.

## 📦 Estado y Datos
- **Activación Real-Time:** Consume el hook `useExtensions` para gestionar y mostrar el estado de habilitación de la extensión `@fluxcore/asistentes`.
- **Detección de Engine:** Usa `useAIStatus` para determinar si el modo activo es conversacional (Asistentes) o determinista (Fluxi), adaptando las opciones de navegación automáticamente.

## 🚀 Funcionalidades Clave

### 🚥 Interruptor de Visibilidad (v8.3)
Incluye un componente `Switch` en la cabecera del sidebar que actúa como el activador manual para el usuario final.
- **Activación:** Al encender el switch, la extensión se marca como `enabled: true`, lo que dispara un evento global que hace aparecer el icono de FluxCore en la `ActivityBar` de forma inmediata.
- **Desactivación:** Oculta el acceso directo pero mantiene el acceso vía el menú de Herramientas para una re-activación posterior.

### 🎨 Branding Consistente
Utiliza el `FluxCoreIcon` oficial de la librería centralizada para asegurar una identidad visual coherente entre el menú lateral y la barra lateral de actividades.

### 🧩 Navegación Adaptativa
Filtra la lista de destinos (`navItems`) basándose en el runtime activo para evitar mostrar secciones irrelevantes (ej: ocultar "Instrucciones" cuando se opera en modo puramente Fluxi).

## 💡 Ejemplo de Uso

```tsx
<FluxCoreSidebar 
   activeView="instructions" 
   onViewChange={handleViewChange} 
   accountName="FluxCore Admin"
   accountId="acc_789"
/>
```

## 🏗️ Arquitectura
Es un componente inteligente que orquesta la navegación de la plataforma. Integra el `SidebarNavList` para el renderizado y el `RuntimeSwitcher` para el cambio de motores IA.
