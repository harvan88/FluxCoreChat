# Sistema de UI de Extensiones
> **Documento Canónico** - TOTEM Compliant
> **Fecha:** 2025-12-12
> **Estado:** Implementado

---

## Resumen

El sistema de UI de extensiones permite que las extensiones instaladas muestren sus propios paneles en el sidebar de FluxCore. Las extensiones definen su UI en el `manifest.json` y el frontend las renderiza dinámicamente.

---

## Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  manifest.json  │────▶│  API Response    │────▶│  ActivityBar    │
│  (ui.sidebar)   │     │  (installations) │     │  (iconos)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │    Sidebar      │
                                                 │  (panel render) │
                                                 └─────────────────┘
```

---

## Manifest UI Configuration

Las extensiones definen su UI en el campo `ui` del manifest:

```json
{
  "id": "@fluxcore/website-builder",
  "ui": {
    "sidebar": {
      "icon": "globe",
      "title": "Sitio Web"
    },
    "panel": {
      "title": "Website Builder",
      "component": "WebsiteBuilderPanel"
    }
  }
}
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ui.sidebar.icon` | string | Nombre del ícono Lucide (globe, calendar, etc.) |
| `ui.sidebar.title` | string | Título en el ActivityBar |
| `ui.panel.title` | string | Título del panel en el Sidebar |
| `ui.panel.component` | string | Nombre del componente React a renderizar |

---

## Íconos Soportados

Los íconos se mapean en `ActivityBar.tsx`:

```typescript
const iconMap: Record<string, React.ReactNode> = {
  globe: <Globe size={22} />,
  calendar: <Calendar size={22} />,
  'shopping-cart': <ShoppingCart size={22} />,
  'file-text': <FileText size={22} />,
  zap: <Zap size={22} />,
  puzzle: <Puzzle size={22} />,
};
```

Para agregar nuevos íconos, actualizar este mapeo.

---

## Componentes Registrados

Los componentes de extensión se registran en `Sidebar.tsx`:

```typescript
const extensionComponents: Record<string, React.ComponentType> = {
  WebsiteBuilderPanel: WebsiteBuilderPanel,
  // Agregar nuevos componentes aquí
};
```

---

## Flujo de Renderizado

### 1. ActivityBar (Íconos)

```typescript
// Generar actividades dinámicas de extensiones con UI
const extensionActivities = installations
  .filter(inst => inst.enabled && inst.manifest?.ui?.sidebar)
  .map(inst => ({
    id: `ext:${inst.extensionId}`,
    icon: iconMap[inst.manifest?.ui?.sidebar?.icon || 'puzzle'],
    label: inst.manifest?.ui?.sidebar?.title,
  }));
```

### 2. Sidebar (Panel)

```typescript
// Verificar si es una actividad de extensión
if (activeActivity.startsWith('ext:')) {
  const extensionId = activeActivity.replace('ext:', '');
  const installation = installations.find(i => i.extensionId === extensionId);
  
  if (installation?.manifest?.ui?.panel?.component) {
    const ExtensionComponent = extensionComponents[componentName];
    return <ExtensionComponent />;
  }
}
```

---

## Requisitos para Extensiones con UI

1. **Manifest válido** con campo `ui`
2. **Extensión instalada** para la cuenta activa
3. **Extensión habilitada** (`enabled: true`)
4. **Permisos concedidos** (verificados en backend)
5. **Componente registrado** en `extensionComponents`

---

## Archivos Relacionados

| Archivo | Responsabilidad |
|---------|-----------------|
| `apps/web/src/components/layout/ActivityBar.tsx` | Renderiza íconos de extensiones |
| `apps/web/src/components/layout/Sidebar.tsx` | Renderiza paneles de extensiones |
| `apps/web/src/hooks/useExtensions.ts` | Hook para obtener instalaciones con manifest |
| `apps/web/src/types/index.ts` | Tipos de ActivityType y ExtensionUIConfig |

---

## Agregar Nueva Extensión con UI

### Paso 1: Crear manifest.json

```json
{
  "id": "@fluxcore/mi-extension",
  "ui": {
    "sidebar": {
      "icon": "zap",
      "title": "Mi Extensión"
    },
    "panel": {
      "title": "Panel de Mi Extensión",
      "component": "MiExtensionPanel"
    }
  }
}
```

### Paso 2: Crear componente React

```typescript
// apps/web/src/components/extensions/MiExtensionPanel.tsx
export function MiExtensionPanel() {
  return <div>Contenido de mi extensión</div>;
}
```

### Paso 3: Registrar componente

```typescript
// apps/web/src/components/layout/Sidebar.tsx
import { MiExtensionPanel } from '../extensions/MiExtensionPanel';

const extensionComponents: Record<string, React.ComponentType> = {
  WebsiteBuilderPanel: WebsiteBuilderPanel,
  MiExtensionPanel: MiExtensionPanel, // Agregar aquí
};
```

### Paso 4: Agregar ícono (si es nuevo)

```typescript
// apps/web/src/components/layout/ActivityBar.tsx
import { Zap } from 'lucide-react';

const iconMap = {
  // ...
  zap: <Zap size={22} />,
};
```

---

## Troubleshooting

### El ícono no aparece en el ActivityBar

1. Verificar que la extensión esté instalada: `GET /extensions/installed/{accountId}`
2. Verificar que esté habilitada: `enabled: true`
3. Verificar que el manifest tenga `ui.sidebar`
4. Verificar que el ícono esté en `iconMap`

### El panel no se renderiza

1. Verificar que el componente esté en `extensionComponents`
2. Verificar que `ui.panel.component` coincida exactamente
3. Revisar consola del navegador por errores

### Permisos no funcionan

1. Verificar en BD: `SELECT * FROM extension_installations WHERE extension_id = '...'`
2. Verificar `granted_permissions` incluye los permisos necesarios
3. Reinstalar extensión si fue instalada antes de la migración de permisos

---

## Changelog

- **2025-12-12**: Implementación inicial del sistema de UI dinámico
