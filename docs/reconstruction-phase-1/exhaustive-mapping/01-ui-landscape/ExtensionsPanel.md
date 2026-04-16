---
id: "extensions-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/extensions/ExtensionsPanel.tsx"
---

# 🤖 ExtensionsPanel

## 🎯 Propósito
El `ExtensionsPanel` es el centro de gestión de la modularidad en FluxCore. Funciona como un orquestador polimórfico que puede presentarse como una tienda completa (Marketplace) o como una lista rápida en la barra lateral. Su responsabilidad es filtrar, buscar y permitir la interacción (instalar, configurar, activar) con las extensiones disponibles para una cuenta.

## 📦 Estado y Datos
- **Hooks:** Utiliza `useExtensions(accountId)` para obtener la lista sincronizada de extensiones e instalaciones.
- **Filtros Dinámicos:** Gestiona el estado de pestañas (`Todas`, `Mis Ext.`, `Tienda`) y una búsqueda en tiempo real basada en texto.
- **Seguridad y Visibilidad (v8.3):** Implementa lógica de filtrado para **extensiones ocultas** (`hidden: true` en el manifest). Esto permite ocultar componentes internos que forman parte de un paquete mayor (ej: los módulos de Fluxi u OpenAI integrados en FluxCore) para no confundir al usuario.

## 🔄 Flujos de Interacción

### 🚥 Filtrado de Componentes Internos
El componente escanea los manifiestos de las extensiones y omite cualquier entrada marcada como `hidden`. Esto garantiza que el Marketplace solo muestre "unidades de negocio" completas y limpias.

### 🛠️ Activación Silenciosa vs. Configuración
Distingue entre el botón de "Configurar" (rueda dentada) y el interruptor de "Activación". Si una extensión como **FluxCore** está instalada pero deshabilitada, el panel permite activarla mediante un `Switch`, disparando una actualización inmediata en la `ActivityBar` mediante eventos globales.

### 📱 Adaptabilidad de UI
- **Variant `full`:** Renderizado en cuadrícula tipo Marketplace para exploración profunda.
- **Variant `sidebar`:** Renderizado condensado mediante `SidebarNavList` para acceso rápido desde paneles laterales.

## 💡 Ejemplo de Uso

```tsx
// Renderizado en modo Marketplace completo
<ExtensionsPanel 
    accountId={currentAccount.id} 
    variant="full" 
/>
```

## 🏗️ Arquitectura
Es un componente inteligente que conecta la lógica del `useExtensions` hook con la presentación visual. Depende de `SidebarNavList` para el renderizado de listas y del `uiStore` para la navegación entre actividades.
