---
id: "website-builder-panel"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/extensions/WebsiteBuilderPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conectado al plugin the Site Generation (Store the Karen)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Zona Amplia Visual de Modificación HTML Remota" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ataque asíncrono Markdown RAW mode" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 WebsiteBuilderPanel (Karen Extension)

## 🎯 Propósito
Es el "Visor / Modificador de Páginas" asociado al Extensión Builder de Sitios Web estáticos (Karen/FluxCore Sites). Intercepta la página actualmente focuseada desde la barra lateral, e invoca un Textarea en Monoespaciado Crudo simulando un Code-Editor barato, guardando esos markdowns al backend, perimitiendo invocar una versión Publicada real saliendo hacia afuera.

## 📦 Estado y Datos
**Gestor Híbrido Cuentas (Fallback):**
- Combina `uiStore` Accounts con la tienda estática `accountStore`. Si uno de ellos recae o la sesión global titubea, asegura atrapar al usuario forzando relectura de IDs antes de permitir mutar una Página Corporativa para salvaguardar fugas de permisos.

## 🔄 Flujos de Interacción
1. **Modo Edición Dualista:** Cuenta con un botón cabecero `setIsEditing` alternando la destrucción visual del `<pre>` por un `<textarea>` en caliente. El texto puro sobrevive local a menos que se invoque a la trinidad backendera superior enviándolo (`saveSelectedPage`).
2. **Escolta de Renderezado Externo:** Calcula links resolutorios (`websiteConfig.publicUrl` + `selectedPage.path`) asumiendo las URLs root (`/`) e iterando `window.open` mandando al publico real a pre-visualizar cómo afectó su markdown.

## 💡 Ejemplo de Uso
```tsx
import { WebsiteBuilderPanel } from '../../components/extensions/WebsiteBuilderPanel';

export const extensionRegistry = {
   componentBlock: WebsiteBuilderPanel
}
```
