---
id: "extensions-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/extensions/ExtensionsPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de useExtensions y uiStore global" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contenedor Mayor de Marketplace y Sidebar Navigation" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Alineación Polimórfica Full-Screen/Sidebar" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ExtensionsPanel

## 🎯 Propósito
(COR-040). Es el Contenedor Absoluto del Sistema de Modularidad de Plugins. No dibuja los plugins, los filtra y orquesta lógicamente con un motor de búsqueda vivo en React. Se adapta de forma camaleónica: Si reside en un Workspace central dibuja una tienda majestuosa con Grillas (variante `full`); si es invocado como herramienta rápida asume forma de tira vertical delegando a `SidebarNavList` renderizado atómico.

## 📦 Estado y Datos
**Matriz Dual de Almacenamiento:**
- `extensions`: Matriz densa obtenida sincrónicamente del Provider `useExtensions(accountId)`.
- `activeTab` ('all', 'installed', 'available') rige el filtro principal y `searchQuery` el barrido tipo texto en tiempo de memoria.

## 🔄 Flujos de Interacción
1. **Delegador Visual según Entorno (`variant`):** Condiciona su armazón superior. Si es "Full", asume rol de Gestor Central pintando "Todas / Instaladas" en Headers grandes. Si es variante Sidebar asume el prefijo compacto de cajones laterales ("Mis Ext / Tienda"), inyectando Inputs diminutos `text-[10px]` conservando espacio de la vista contigua del usuario.
2. **Máquina de Enrutamiento Invasivo (`getExtensionConfigureHandler`):** No todos los plugins abren menús simples. Verifica internamente la identidad del Manifiesto Instalado. Si su bandera interna indica "Soy la extensión CORE (FluxCorePanel)" o "Traigo mi propio UI", omite invocar las ventanas de Configuración Genéricas, disparando en cambio `setActiveActivity` o manipulando `openTab`, inyectando esa App entera paralela al usuario obligándolo a interactuar a su modo.
3. **Construcción Pasiva de Contadores Matemáticos:** Sin usar Memos computados pesados, emplea sumatorias crudas `counts` que extraen de la memoria la exactitud métrica subyacente de cada vector para pintar sutilmente sobre el Menú la demografía de Extensiones.

## 💡 Ejemplo de Uso
```tsx
import { ExtensionsPanel } from '../../components/extensions/ExtensionsPanel';

// Modo Tienda Principal en Grid de Panel Central
<DynamicContainer>
   <ExtensionsPanel accountId={workspace.selected} variant="full" />
</DynamicContainer>

// O Invocación Micro-Integrada de Accesos Directos
<LeftRailDrawer>
    <ExtensionsPanel accountId={workspace.selected} variant="sidebar" />
</LeftRailDrawer>
```
