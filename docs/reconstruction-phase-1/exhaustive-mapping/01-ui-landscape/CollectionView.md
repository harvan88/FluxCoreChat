---
id: "collection-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/shared/CollectionView.tsx"
---

# 🤖 CollectionView

## 🎯 Propósito
Componente maestro de alto nivel para el renderizado de listados y dashboards. Encapsula la lógica de cabecera (`ViewHeader`), filtrado, estados de carga y el motor de tablas responsivas. Su objetivo es unificar la experiencia de usuario en todos los módulos de FluxCore (Plantillas, Asistentes, Conocimiento).

## 💡 Ejemplo de Uso
```tsx
import { Database } from 'lucide-react';
import { CollectionView } from '../shared/CollectionView';

<CollectionView<VectorStore>
    icon={Database}
    title="Base de conocimiento"
    data={stores}
    loading={loading}
    getRowKey={(row) => row.id}
    columns={columns}
    onCreate={handleCreate}
    renderActions={(row) => <EntityActions onDelete={() => handleDelete(row.id)} />}
/>
```

## 📦 Estado y Datos
- **Arquitectura Genérica `<T>`**: Funciona con cualquier tipo de dato mediante el uso de genéricos de TypeScript, exigiendo únicamente una función `getRowKey` y una definición de columnas.
- **Detección de Vacíos**: Si la propiedad `data` es un arreglo vacío y `loading` es false, el componente renderiza automáticamente un `EmptyState` personalizado.

## 🔄 Flujos de Interacción
1. **Vista Híbrida (Responsive)**: 
   - **Desktop**: Renderiza una rejilla de datos completa utilizando el componente `Table`.
   - **Mobile**: Transiciona automáticamente a una vista de tarjetas (`List`) simplificada para mejorar la usabilidad en pantallas pequeñas.
2. **Control de Columnas Responsivas**: Permite ocultar columnas específicas en diferentes breakpoints mediante la propiedad `hideBelow` en la definición de cada columna.
3. **Inyección de Acciones**: Proporciona slots (`renderActions`, `renderMobileActions`) para inyectar botones de operación sin acoplar el componente a la lógica de negocio específica de cada entidad.

## 🛡️ Notas Arquitectónicas
- **Integración con ViewHeader**: Utiliza el componente `ViewHeader` para mantener una consistencia visual absoluta en los títulos y acciones globales de la vista.
- **Estandarización de Bordes**: El contenedor principal utiliza `.border-subtle` con opacidad refinada, eliminando el ruido visual y manteniendo la estética Bauhaus.
