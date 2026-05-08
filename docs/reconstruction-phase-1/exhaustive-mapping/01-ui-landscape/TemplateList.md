---
id: "template-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/templates/TemplateList.tsx"
---

# 🤖 TemplateList

## 🎯 Propósito
Componente de gestión para el listado de plantillas de respuesta. Utiliza el motor `CollectionView` para proporcionar una interfaz coherente, permitiendo la búsqueda, creación y eliminación de plantillas en un entorno multi-dispositivo.

## 💡 Ejemplo de Uso
```tsx
import { TemplateList } from './components/templates';

<TemplateList 
  templates={allTemplates}
  loading={isLoading}
  onSelect={(t) => editTemplate(t)}
  onDelete={(id) => deleteTemplate(id)}
/>
```

## 🔄 Flujos de Interacción
1. **Optimización de Columnas (Mobile-First)**: Para cumplir con los requerimientos de simplicidad en pantallas pequeñas, la lista oculta las columnas "Contenido" y "Categoría" por debajo de los breakpoints `md` y `lg` respectivamente, manteniendo visibles solo el nombre y las acciones críticas.
2. **Navegación al Editor**: El clic en una fila dispara el callback `onSelect`, que típicamente abre el `TemplateEditor` en una nueva pestaña o modal.
3. **Acciones Contextuales**: Cada plantilla cuenta con acciones de clonación, exportación y borrado (con doble confirmación).

## 🛡️ Notas Arquitectónicas
- **Basado en CollectionView**: Delegar el renderizado a `CollectionView` garantiza que la lista de plantillas herede automáticamente todas las mejoras visuales y de rendimiento del sistema central de tablas.
- **Gestión de Estado**: Consume datos del `useTemplateStore` para reflejar cambios en tiempo real sin necesidad de recargas de página manuales.
