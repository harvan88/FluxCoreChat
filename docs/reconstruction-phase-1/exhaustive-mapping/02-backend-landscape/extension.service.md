---
id: "extension-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/extension.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (extensionInstallations, extensionContexts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Ciclo de Vida de Extensiones (FC-154)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Installation management, Configuration persistence, Permission granting (RBAC), Uninstallation cleanup" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ExtensionService

## 🎯 Propósito
El `ExtensionService` gestiona el ecosistema de complementos de FluxCore. Permite que cuentas específicas "instalen" capacidades adicionales (como la propia IA o integraciones externas), manejando sus configuraciones privadas y permisos concedidos de manera segura.

## 🚥 Modelo de Permisos
Cada instalación de extensión registra una lista de `grantedPermissions`. Esto permite un control granular: una extensión puede tener permiso para leer el historial de chat pero no para acceder a los datos privados del perfil, garantizando que el usuario mantenga el control sobre sus datos.

## 🧹 Limpieza de Contexto
Al desinstalar una extensión, el servicio no solo elimina la fila de instalación, sino que realiza una purga en cascada de los `extensionContexts`. Esto asegura que no queden datos huérfanos o basura técnica cuando una cuenta decide dejar de usar una capacidad opcional.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { extensionService } from 'apps/api/src/services/extension.service.ts';

// Ejemplo de invocación típica
const result = await extensionService.execute(params);
```
