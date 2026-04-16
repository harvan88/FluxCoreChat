---
id: "manifest-loader-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/manifest-loader.service.ts"
---

# ⚙️ manifest-loader.service

## 🎯 Propósito
El `manifest-loader.service` es el punto de entrada para los metadatos de las extensiones. Se encarga de cargar, validar y registrar las capacidades del sistema, asegurando que cumplan con el estándar de seguridad y diseño de FluxCore.

## 🚀 Funcionalidades Clave

### 📂 Carga Multinivel
- **Built-in:** Extensiones registradas directamente en código para capacidades núcleo (ej: `FluxCore`).
- **File System:** Escanea el directorio `/extensions` para cargar complementos dinámicamente.

### 📐 Validación de Esquema
Certifica que cada extensión declare correctamente:
- **Identidad:** ID, nombre, versión y descripción.
- **Seguridad:** Lista blanca de permisos permitidos.
- **Configuración:** `configSchema` utilizado para generar formularios dinámicos en el frontend.

### 🖥️ Metadatos de UI (v8.3)
El cargador ahora procesa metadatos visuales críticos:
- **Sidebar Config:** Define el icono (`Bot`, `Zap`, etc.), el título y la **prioridad** para su visualización en la barra lateral.
- **Panel Config:** Define el componente de React (`FluxCorePanel`, etc.) que se renderizará al activar la extensión.

## 💡 Ejemplo de Uso

### Obtener extensiones preinstaladas
```typescript
const presets = manifestLoader.getPreinstalledManifests();
// Retorna la lista de manifiestos marcados como preinstalled: true
```

### Generación de configuración por defecto
```typescript
const config = manifestLoader.getDefaultConfig("@fluxcore/asistentes");
```

## 🏗️ Arquitectura
Actúa como un puente entre los archivos de configuración y la lógica de negocio del `ExtensionService`. Es una pieza clave del arranque del sistema (`kernel.bootstrap.ts`).
