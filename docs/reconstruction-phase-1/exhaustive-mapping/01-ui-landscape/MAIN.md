---
id: "main-entry"
type: "core"
status: "stable"
criticality: "high"
location: "apps/web/src/main.tsx"
---
# main.tsx – Entry Point de React y Router

**Ubicación:** `apps/web/src/main.tsx`  
**Tamaño:** 12 líneas  
**Propósito:** Punto de arranque mínimo que monta la aplicación React `App` dentro de `BrowserRouter`.

---

## 🧩 1. Código Completo

```typescript
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

- **Root DOM:** Usa `document.getElementById('root')!` como contenedor.
- **Router:** Envuelve `App` en `BrowserRouter` para habilitar rutas declaradas en `App.tsx`.
- **Estilos globales:** Importa `./index.css`, que aplica el design system y resets.

---

## � 2. Dependencias

### 2.1 Dependencias que consume:
- **React 18:** Para renderizado concurrente y hooks
- **React DOM:** Para montar en el DOM real
- **React Router:** Para contexto de routing (`BrowserRouter`)

### 2.2 Quién depende de él:
- **Vite Bundle:** Lo usa como entry point principal
- **index.html:** Contiene el `div#root` donde se monta
- **App.tsx:** Es montado dentro del `BrowserRouter` proporcionado

---

## �🔄 3. Flujos Principales

### 🔄 2.1 Bootstrap de la aplicación

1. El bundle de Vite monta `main.tsx` como entry point.
2. `ReactDOM.createRoot` inicializa la raíz concurrente de React.
3. Se renderiza `<BrowserRouter><App /></BrowserRouter>` en el elemento `#root`.
4. A partir de aquí, `App.tsx` controla routing, tema y autenticación.

---

## 🔧 3. Integraciones

- **React 18 Root API:** Uso de `ReactDOM.createRoot` (no `render` legacy).
- **React Router:** `BrowserRouter` provee contexto de routing a todos los componentes hijos.
- **Design System:** `index.css` integra el sistema de diseño canónico documentado en `docs/DESIGN_SYSTEM.md`.

---

## 📋 4. Pendientes / Notas

- 📋 Verificar que `index.html` siempre contenga `<div id="root">` alineado con este entry point.
- 📋 Mantener `main.tsx` libre de lógica de negocio; toda la lógica debe residir en `App` o componentes inferiores.
