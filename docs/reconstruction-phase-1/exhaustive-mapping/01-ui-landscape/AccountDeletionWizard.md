---
id: "account-deletion-wizard"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/accounts/AccountDeletionWizard.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Atado estricamente a `useAccountDeletion` (Manejo de Background Jobs)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Guía Visual Pasiva del Proceso de Auto-Destrucción (GDPR)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Generación de links seguros con Expiración, Switch-case visual multi-paso" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧙‍♂️ AccountDeletionWizard

## 🎯 Propósito
Es el "Tráqueo Logístico" post-solicitud (La versión expandida embebida en la cuenta de lo que pasó en el Modal). Un Asistente de paso a paso hiper-detallado para el Owner. Convierte la espera aburrida de un "Borrando miles de mensajes de IA..." en un panel de progreso transparente de 3 Fases y arroja los enlaces encriptados a los ZIP de copias de seguridad prometidas.

## 📦 Estado y Datos
**Manejo de Portales Seguros Temporales:**
- Rescata los Links Únicos del Hook (`snapshotDownloadUrl`, `snapshotPortalUrl`) con sus fechas finitas de caducidad y monta un panel con 4 Botones Ghost para abrir, copiar, y descargar.
- **Auto-Kicker (`redirectedRef`)**: Si el Job de Postgres salta mágicamente de "Preparando snapshot" a "completed o despachado", este componente empuja a la fuerza al humano fuera de la App principal saltando con React Router (`/auth/deleted/:id`) bloqueándole reingresos.

## 🔄 Flujos de Interacción
1. **La Traducción del Job (Switch-Case label):** Lee el enigmático String sucio del cluster (`external_cleanup`, `local_cleanup`) y escupe texto tranquilizador como "Limpiando integraciones externas".
2. **Drenador de Consentimiento Local (`localConsent`):** Obliga a clickear "Entendí el backup descargado" antes de pasar al paso final si se pidió retención de datos.

## 💡 Ejemplo de Uso
```tsx
<AccountDeletionWizard 
    accountId={company.id} 
    accountName="Dunder Mifflin" 
/>
```
