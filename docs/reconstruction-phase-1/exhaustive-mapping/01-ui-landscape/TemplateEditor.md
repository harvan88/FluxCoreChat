---
id: "template-editor"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/templates/TemplateEditor.tsx"
---

# 🤖 TemplateEditor

## 🎯 Propósito
Editor avanzado para la creación y modificación de plantillas de respuesta. Permite editar el contenido en formato Markdown/Text, gestionar variables dinámicas, configurar la visibilidad IA y adjuntar recursos multimedia.

## 📦 Estado y Datos
- **Store Integration**: Utiliza `useTemplateStore` para gestionar el estado de persistencia y carga. Se ha corregido recientemente la desestructuración de `isLoading` para evitar errores de referencia en tiempo de ejecución.
- **Componentes de Soporte**: Utiliza `LoadingState` para proporcionar feedback visual durante las operaciones asíncronas de guardado y carga.

## 🔄 Flujos de Interacción
1. **Edición Dinámica**: El usuario puede modificar campos como nombre, categoría y contenido. El sistema valida automáticamente la integridad de los datos antes de permitir el guardado.
2. **Previsualización**: (Si aplica) Permite ver cómo se renderizará la plantilla con valores reales antes de publicarla.
3. **Persistencia Silenciosa**: Implementa lógica para evitar la pérdida de datos accidental al cerrar la pestaña o navegar fuera del editor.

## 🛡️ Notas Arquitectónicas
- **Estabilidad Reforzada**: Se han corregido errores críticos de importación y de acceso a variables de estado que causaban crashes en el entorno de producción.
- **Acoplamiento**: El editor está estrechamente vinculado al sistema de `assets` para permitir la vinculación de imágenes y archivos a las plantillas.
