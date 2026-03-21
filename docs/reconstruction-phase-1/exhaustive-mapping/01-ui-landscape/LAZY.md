---
id: "lazy-helper"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/lazy.tsx"
---

# lazy.tsx – Helper de Lazy Loading de Componentes

**Ubicación:** `apps/web/src/components/lazy.tsx`  
**Tamaño:** 61 líneas  
**Propósito:** Proveer un helper `lazyWithFallback` y un conjunto de componentes cargados en diferido (lazy) para reducir el bundle inicial.

---

## 🧩 1. Estructura del Módulo

```typescript
// apps/web/src/components/lazy.tsx
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="animate-spin text-muted" size={32} />
    </div>
  );
}

export function lazyWithFallback<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
```

- **`LoadingFallback`**: componente de loading estándar con spinner `Loader2`.
- **`lazyWithFallback`**: helper genérico que envuelve `React.lazy` + `Suspense` con un fallback consistente.

---

## 🔧 2. Tipos e Interfaces Relevantes

```typescript
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

export function lazyWithFallback<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
```

---

## 📋 3. Props (Parámetros)

### `lazyWithFallback<T>`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `importFn` | `() => Promise<{ default: T }>` | Función de importación dinámica |
| `fallback` | `ReactNode` | Componente a mostrar mientras carga (opcional) |

---

## 💻 4. Ejemplo de Uso

```typescript
import { lazyWithFallback } from './components/lazy';

// Uso básico con fallback por defecto
const LazyComponent = lazyWithFallback(() => import('./HeavyComponent'));

// Uso con fallback personalizado
const LazyCustom = lazyWithFallback(
  () => import('./CustomComponent'),
  <div>Cargando componente...</div>
);

// En el componente padre
function App() {
  return (
    <div>
      <LazyComponent />
      <LazyCustom />
    </div>
  );
}
```

---

## 🎯 5. Beneficios
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = <LoadingFallback />
) {
  // ...
}
```

- Usa **genéricos TypeScript** para preservar correctamente los `props` de cada componente lazy.
- `React.ComponentProps<T>` asegura que `LazyWrapper` expone la misma firma de props que el componente original.

---

## 🧱 3. Componentes Lazy Exportados

```typescript
// Settings Panel - carga cuando usuario abre settings
export const LazySettingsPanel = lazyWithFallback(
  () => import('./settings/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

// Extensions Panel - carga cuando usuario abre extensions
export const LazyExtensionsPanel = lazyWithFallback(
  () => import('./extensions/ExtensionsPanel').then(m => ({ default: m.ExtensionsPanel }))
);

// Component Showcase - solo para desarrollo
export const LazyComponentShowcase = lazyWithFallback(
  () => import('./examples/ComponentShowcase').then(m => ({ default: m.ComponentShowcase }))
);

// Enrichment components - cargan con mensajes
export const LazyEnrichmentBadge = lazyWithFallback(
  () => import('./enrichments/EnrichmentBadge').then(m => ({ default: m.EnrichmentBadge }))
);

export const LazyEnrichmentPanel = lazyWithFallback(
  () => import('./enrichments/EnrichmentBadge').then(m => ({ default: m.EnrichmentPanel }))
);
```

- **Settings/Extensions:** sólo se cargan cuando el usuario abre esos paneles.
- **ComponentShowcase:** orientado a desarrollo/demo.
- **EnrichmentBadge/Panel:** UI adicional que se carga junto con mensajes enriquecidos.

---

## 🔄 4. Flujos de Carga Diferida

### 🔄 4.1 Flujo general `lazyWithFallback`

1. Algún componente UI importa `LazyXxx` en lugar de `Xxx` directamente.
2. En tiempo de render, `Suspense` muestra `LoadingFallback` mientras se resuelve el `import()` dinámico.
3. Una vez que el bundle del componente se descarga, `LazyComponent` se monta con los props originales.
4. El fallback desaparece y se muestra el componente real.

### 🔄 4.2 Impacto en rendimiento

- Reduce el **bundle inicial** al sacar paneles no críticos (settings, extensiones, demos).
- Mejora **Time To Interactive (TTI)** en la carga inicial de la app.

---

## 🔧 5. Integraciones y Dependencias

- **`lucide-react`**: icono `Loader2` usado como spinner estándar.
- **React Suspense & lazy:** API oficial de React para code-splitting.
- **Design system:** el fallback respeta las clases canónicas (`bg-base`, `text-muted`, etc.).

---

## 📋 6. Pendientes / Notas

- 📋 Documentar qué rutas o vistas concretas usan cada `Lazy*` para tener un mapa completo de chunks.
- 📋 Añadir métricas de carga (Web Vitals) que muestren el impacto real del lazy loading.
- 📋 Evaluar mover componentes sólo-de-desarrollo (como `ComponentShowcase`) fuera del bundle de producción.
