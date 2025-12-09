# Guía de Diseño para Extensiones - FluxCore

**Versión:** 1.0.0  
**Fecha:** 2024-12-08  
**Issue:** FC-417

---

## 📋 Introducción

Esta guía establece las reglas y mejores prácticas para el desarrollo de extensiones en FluxCore. Todas las extensiones **DEBEN** seguir estas directrices para garantizar consistencia visual y compatibilidad.

---

## 🚫 Reglas Fundamentales

### Prohibiciones

```typescript
// ❌ PROHIBIDO: HTML arbitrario
<div style={{ backgroundColor: '#1a1a1a' }}>
  <button className="bg-blue-500">Click</button>
</div>

// ❌ PROHIBIDO: Colores hardcodeados
<span className="text-gray-400 bg-gray-800">Texto</span>

// ❌ PROHIBIDO: Estilos inline
<input style={{ padding: '8px', border: '1px solid #ccc' }} />

// ❌ PROHIBIDO: CSS variables directas
<div className="bg-[var(--accent-primary)]">No usar</div>
```

### Obligatorio

```typescript
// ✅ OBLIGATORIO: Usar componentes de la biblioteca
import { Button, Input, Card, Badge } from '@/components/ui';

<Card variant="elevated">
  <CardBody>
    <Input label="Nombre" variant="text" />
    <Button variant="primary">Guardar</Button>
  </CardBody>
</Card>

// ✅ OBLIGATORIO: Usar clases canónicas
<div className="bg-surface text-primary border-subtle">
  Contenido
</div>
```

---

## 🎨 Sistema de Colores

### Clases de Background

| Clase | Uso | Ejemplo |
|-------|-----|---------|
| `bg-base` | Fondo principal de la app | Body, contenedor principal |
| `bg-surface` | Superficies elevadas | Cards, paneles |
| `bg-elevated` | Elementos sobre superficies | Dropdowns, modales |
| `bg-hover` | Estado hover | Botones, items de lista |
| `bg-active` | Estado activo | Item seleccionado |
| `bg-accent` | Color de acento | Botones primarios |
| `bg-error` | Estados de error | Alertas de error |
| `bg-success` | Estados de éxito | Confirmaciones |
| `bg-warning` | Advertencias | Alertas de warning |

### Clases de Texto

| Clase | Uso | Ejemplo |
|-------|-----|---------|
| `text-primary` | Texto principal | Títulos, contenido importante |
| `text-secondary` | Texto secundario | Descripciones, subtítulos |
| `text-muted` | Texto apagado | Placeholder, texto de ayuda |
| `text-inverse` | Texto sobre fondo oscuro | Botones primarios |
| `text-accent` | Texto de acento | Links, highlights |
| `text-error` | Texto de error | Mensajes de error |
| `text-success` | Texto de éxito | Confirmaciones |

### Clases de Borde

| Clase | Uso |
|-------|-----|
| `border-subtle` | Bordes sutiles |
| `border-default` | Bordes estándar |
| `border-accent` | Bordes de acento |
| `border-error` | Bordes de error |

---

## 📦 Componentes Disponibles

### Button

```typescript
import { Button } from '@/components/ui';

// Variantes
<Button variant="primary">Primario</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Peligro</Button>

// Tamaños
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>

// Con iconos
<Button leftIcon={<Save size={16} />}>Guardar</Button>

// Estados
<Button loading>Cargando...</Button>
<Button disabled>Deshabilitado</Button>
```

### Input

```typescript
import { Input, Textarea } from '@/components/ui';

// Variantes
<Input variant="text" label="Nombre" />
<Input variant="email" label="Email" />
<Input variant="password" label="Contraseña" />
<Input variant="search" placeholder="Buscar..." />
<Input variant="number" label="Cantidad" />

// Con validación
<Input 
  label="Email" 
  error="Email inválido" 
  helperText="Ingrese su email"
/>

// Textarea
<Textarea label="Descripción" rows={4} />
```

### Card

```typescript
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card variant="elevated">
  <CardHeader 
    title="Título"
    subtitle="Descripción"
    actions={<Button variant="ghost">Acción</Button>}
  />
  <CardBody>
    Contenido aquí
  </CardBody>
  <CardFooter align="right">
    <Button variant="secondary">Cancelar</Button>
    <Button variant="primary">Guardar</Button>
  </CardFooter>
</Card>
```

### Badge

```typescript
import { Badge } from '@/components/ui';

// Variantes
<Badge variant="info">Info</Badge>
<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="neutral">Inactivo</Badge>

// Estilos
<Badge badgeStyle="solid">Sólido</Badge>
<Badge badgeStyle="soft">Suave</Badge>
<Badge badgeStyle="outline">Outline</Badge>

// Con icono
<Badge leftIcon={<Check size={12} />} variant="success">
  Completado
</Badge>
```

### Table

```typescript
import { Table, type Column } from '@/components/ui';

const columns: Column[] = [
  { id: 'name', header: 'Nombre', accessor: (row) => row.name, sortable: true },
  { id: 'status', header: 'Estado', accessor: (row) => (
    <Badge variant={row.active ? 'success' : 'neutral'}>
      {row.active ? 'Activo' : 'Inactivo'}
    </Badge>
  )},
];

<Table
  columns={columns}
  data={items}
  getRowKey={(row) => row.id}
  selectable
  onRowClick={(row) => handleClick(row)}
/>
```

### Select

```typescript
import { Select } from '@/components/ui';

const options = [
  { value: '1', label: 'Opción 1' },
  { value: '2', label: 'Opción 2' },
];

<Select
  options={options}
  value={selected}
  onChange={setSelected}
  label="Seleccionar"
  searchable
  clearable
/>
```

### Checkbox y Radio

```typescript
import { Checkbox, Radio, RadioGroup } from '@/components/ui';

// Checkbox
<Checkbox 
  label="Acepto términos" 
  checked={accepted}
  onChange={(e) => setAccepted(e.target.checked)}
/>

// Radio Group
<RadioGroup
  name="theme"
  value={theme}
  onChange={setTheme}
  options={[
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Sistema' },
  ]}
/>
```

### Avatar

```typescript
import { Avatar, AvatarGroup } from '@/components/ui';

// Simple
<Avatar name="John Doe" status="online" />

// Con imagen
<Avatar src="/avatar.jpg" alt="John" status="online" />

// Grupo
<AvatarGroup max={4}>
  <Avatar name="User 1" />
  <Avatar name="User 2" />
  <Avatar name="User 3" />
  <Avatar name="User 4" />
  <Avatar name="User 5" />
</AvatarGroup>
```

### SidebarLayout

```typescript
import { SidebarLayout, SidebarSection, SidebarItem } from '@/components/ui';

<SidebarLayout
  title="Mi Extensión"
  icon={<Puzzle size={20} />}
  showSearch
  onSearchChange={setSearch}
  isPinned={pinned}
  onTogglePin={togglePin}
>
  <SidebarSection title="Sección 1">
    <SidebarItem
      icon={<Settings size={18} />}
      label="Configuración"
      active={activeItem === 'config'}
      onClick={() => setActiveItem('config')}
    />
  </SidebarSection>
</SidebarLayout>
```

---

## 📝 Manifest de Extensión

### Estructura Básica

```json
{
  "id": "@vendor/extension-name",
  "name": "Nombre de Extensión",
  "version": "1.0.0",
  "description": "Descripción breve",
  "author": "Vendor Name",
  "permissions": [
    "read:context.public",
    "send:messages"
  ],
  "ui": {
    "allowedComponents": [
      "Button",
      "Input",
      "Card",
      "Badge",
      "Table",
      "Select",
      "Checkbox",
      "Avatar"
    ],
    "customCSS": false
  },
  "config_schema": {
    "enabled": { "type": "boolean", "default": true },
    "apiKey": { "type": "string", "secret": true }
  }
}
```

### Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `read:context.public` | Leer contexto público |
| `read:context.private` | Leer contexto privado |
| `read:context.relationship` | Leer contexto de relaciones |
| `read:context.history` | Leer historial de mensajes |
| `write:context.overlay` | Escribir contexto overlay |
| `send:messages` | Enviar mensajes |
| `modify:automation` | Modificar reglas de automatización |

---

## 🎯 Ejemplos Completos

### Panel de Configuración

```typescript
import { 
  Card, CardHeader, CardBody, CardFooter,
  Input, Select, Checkbox, Button 
} from '@/components/ui';

export function ExtensionConfigPanel({ config, onSave }) {
  const [formData, setFormData] = useState(config);

  return (
    <Card variant="elevated">
      <CardHeader 
        title="Configuración"
        subtitle="Ajusta los parámetros de la extensión"
      />
      <CardBody className="space-y-4">
        <Input
          label="API Key"
          variant="password"
          value={formData.apiKey}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
        />
        <Select
          label="Modo"
          options={[
            { value: 'auto', label: 'Automático' },
            { value: 'manual', label: 'Manual' },
          ]}
          value={formData.mode}
          onChange={(v) => setFormData({ ...formData, mode: v })}
        />
        <Checkbox
          label="Habilitar notificaciones"
          checked={formData.notifications}
          onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
        />
      </CardBody>
      <CardFooter align="right">
        <Button variant="primary" onClick={() => onSave(formData)}>
          Guardar
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Lista de Items

```typescript
import { 
  SidebarLayout, SidebarSection, SidebarItem,
  Badge, Avatar 
} from '@/components/ui';

export function ExtensionSidebar({ items, activeId, onSelect }) {
  return (
    <SidebarLayout
      title="Mis Items"
      showSearch
      onSearchChange={setSearch}
    >
      <SidebarSection title="Recientes">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            icon={<Avatar name={item.name} size="sm" />}
            label={item.name}
            secondaryLabel={item.description}
            badge={item.unread > 0 && (
              <Badge variant="info" size="sm">{item.unread}</Badge>
            )}
            active={activeId === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </SidebarSection>
    </SidebarLayout>
  );
}
```

---

## ✅ Checklist de Validación

Antes de publicar una extensión, verificar:

- [ ] ✅ Solo usa componentes de la biblioteca
- [ ] ✅ No tiene colores hardcodeados
- [ ] ✅ No tiene estilos inline
- [ ] ✅ Manifest declara `allowedComponents`
- [ ] ✅ Permisos mínimos necesarios
- [ ] ✅ Funciona en tema claro y oscuro
- [ ] ✅ Es accesible (keyboard navigation)
- [ ] ✅ Es responsive

---

## 🔗 Referencias

- [Component Library](./COMPONENT_LIBRARY.md) - Documentación completa de componentes
- [Design System](./DESIGN_SYSTEM.md) - Sistema de diseño canónico
- [TOTEM](../TOTEM.md) - Especificación de arquitectura

---

**Mantenido por:** FluxCore Team  
**Última actualización:** 2024-12-08
