---
id: "asset-policy-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-policy.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (assetPolicies), Storage Adapter, AssetRegistry, WorldDefiner" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Políticas de Acceso y Firmado de URLs" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context evaluation, Signed URL generation, TTL management, Channel inference via WorldDefiner, Asset scope mapping" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetPolicyService

## 🎯 Propósito
Este servicio actúa como el portero de seguridad para el acceso a archivos brutos. En lugar de exponer URLs directas, genera **URLs firmadas temporalmente** (Shared Access Signatures) basándose en el contexto del usuario y las políticas de la cuenta.

## 🚥 Jerarquía de Políticas
1.  **Account Policy**: Si una cuenta configuró reglas personalizadas para un tipo de archivo (ej. `profile_avatar`).
2.  **Global Policy**: Reglas definidas en base de datos para todo el sistema.
3.  **System Default**: Hardcoded fallbacks en el servicio para garantizar que el sistema nunca quede desprotegido.

## ⏳ Gestión de TTL (Time To Live)
Los tiempos de validez varían según el riesgo y el uso:
-   **`message_attachment`**: 1 hora (Seguridad estándar).
-   **`profile_avatar`**: 24 horas (Balance entre seguridad y desempeño de caché).
-   **`public_profile_avatar`**: 1 año (Para SEO e identidades públicas).
-   **`execution_plan`**: 30 minutos (Alta sensibilidad técnica).

## 🌍 Integración con WorldDefiner
Al firmar una URL, el servicio consulta al `ChatCoreWorldDefiner` para inferir el "Canal" de acceso (`web`, `mobile`, `assistant`). Esto permite aplicar reglas de visibilidad dinámicas (ej. un archivo solo visible para la IA pero no para el humano).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetPolicyService } from 'apps/api/src/services/asset-policy.service.ts';

// Ejemplo de invocación típica
const result = await assetPolicyService.execute(params);
```
