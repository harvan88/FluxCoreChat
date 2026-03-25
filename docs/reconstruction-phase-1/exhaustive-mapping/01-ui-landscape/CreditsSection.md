---
id: "credits-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/settings/CreditsSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conquista endpoints privados API CreditsAdmin" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel Oculto SuperAdmin Settings" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Operaciones Batch Crud completas y manejo de fondos MOCK Tokens" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 CreditsSection

## 🎯 Propósito
Panel secreto restringido para Super Administradores Integrado a manera expansiva en la App (Se accede por lo general desde el Sistema Central de Menú/Settings pero falla vía HTTP 403 API si quien navega carece de roles God). Permite inyectar Monedas y Créditos a usuarios manualmente, saltándose los puentes Gateway de facturación. Adicionalmente, administra las "Reglas de Políticas Universales", delimitando qué motores LLM de Mercado (E.g. OpenAI GPT-4o-mini) proveen cuantas combinaciones de Tokens y Horas base a la empresa SaaS Múltiple alquilada.

## 📦 Estado y Datos
**Mega-Estructura Jerárquica:**
- Matriz Transaccional de Buscador `results(AdminAccountRow[])`.
- Formulario de Depósito Bursátil `grantAmount`.
- Reglas Maestras de Sistema de Negocios de la IA (Listado CRUD reactivo en caliente de Tokens): `policies`,  `policyForm`, `editingPolicyId`. 

## 🔄 Flujos de Interacción
1. **Debounce Universal de Búsqueda Forense:** Instancia una barrera de retraso en Javascript (setTimeout de 350 milisegundos). Al tipear letras busca coincidencias parciales con `creditsAdminSearch`. Si retorna fallos, emite Alertas rojas en UI, y si retorna Éxito empadrona y pre-selecciona el Primer Nodo (`rows[0]?.id`).
2. **Inyector Sub-Económico (`handleGrant`):** Valida la entrada cruda que exige Números Finitos Seguros en JS (`Number.isFinite`), bloquea la UI, invoca `creditsAdminGrant` y luego parchea directamente el Arreglo de Búsqueda existente con el nuevo Balance devuelto de la operación matemática servidor permitiendo feedback instantáneo de sumas sin tener que recargar el query anterior.
3. **Planes de Política IAM-Flux (Policies):** Representan el core duro de las restricciones del Sistema para Gastos de Operadores de IA (`api.creditsAdminCreatePolicy/Update/Toggle`). Ofrece una Interfaz en Tabla (`grid grid-cols-7`) con Switches inyectados de Desactivación y rellenados automáticos del `<form>`. Todos los flujos se interceptan impidiendo la recarga Nativa por Default (`event.preventDefault`), controlando el flujo reactivo y validando de golpe si el administrador intentó establecer limites ilógicos (menos que 0, valores strings a enteros) antes de salvar al Server.

## 💡 Ejemplo de Uso
```tsx
import { CreditsSection } from '../../components/settings/CreditsSection';

{superUserContextActivo && (
   <CreditsSection onBack={() => returnMainPanel()} />
)}
```
