---
id: "website-builder-sidebar"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/extensions/WebsiteBuilderSidebar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Engranado en SidebarHost simulando AppNatita" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Micro-Gestor Jerárquico de Routing Static" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controles Creadores (Window Prompts), Generador SSG Local" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 WebsiteBuilderSidebar

## 🎯 Propósito
(Companion del Panel Builder). Inyectado como una tira de menú en la Izquierda del todo. Administra el "Árbol Genealógico" del Sitio Web. Controlable en tiempo vivo, permitiendo generar (`buildWebsite`), desplegar (`publishWebsite`) a internet o acoplar metadatos ("Autorizarle a mi IA a consumir mi sitio completo con Scrap automático (`allowAutomatedUse`)").

## 📦 Estado y Datos
**Monitor Backend Cíclico:**
- Analiza `websiteConfig?.status`, inyectándolo en su capa text-label (`Borrador`, `Publicado`, `Archivado`). Oculta condicionalmente de forma agresiva la existencia total del Subarbol si detecta que la API responde vacío ("Crear nuevo sitio").

## 🔄 Flujos de Interacción
1. **Constructos Básicos (JS Native Prompts):** Escapa de modales fastidiosos React; utiliza la función ultra primitiva de navegador `prompt()` para inyectar URLs y paths de nuevas páginas rápidamente de manera "Hustler", autoagregando slashes `/` e iterando sobre el back de golpe para redibujar la tabla de botones.
2. **Ciclo DevOps Express:** Proporciona un pipeline de vida entero en 3 botones abajo. "Generar Sitio" (Compila todos los Markdown a HTML estático en el back). "Publicar" (Sincroniza y hace Push a internet Cloud). Una ventana incrustada permite a cualquier operador con cero nociones de código mandar su portafolio online a base de clicks.

## 💡 Ejemplo de Uso
```tsx
import { WebsiteBuilderSidebar } from '../../components/extensions/WebsiteBuilderSidebar';

if (panelName === 'WebsiteBuilderPanel') {
  return <WebsiteBuilderSidebar />;
}
```
