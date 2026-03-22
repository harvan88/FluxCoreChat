---
id: "account-deletion-modal"
type: "smart-component"
status: "wip"
criticality: "high"
location: "apps/web/src/components/accounts/AccountDeletionModal.tsx"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "2026-03-22"
    confidence: 100
    notes: "Componente detectado y analizado automáticamente"
  
  connections:         # Capa 2: Conexiones e Interdependencias
    status: "pending"
    completed_date: ""
    confidence: 0
    dependencies_mapped: 0
    notes: "Falta mapear conexiones con hooks y servicios. MECANISMOS DE ELIMINACIÓN NO DEFINIDOS"
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "pending"
    completed_date: ""
    confidence: 0
    subsystem: ""
    purpose_validated: false
    notes: "Falta asignar a subsistema. ESTRATEGIA DE ELIMINACIÓN MÍNIMO-MÁXIMO NO CERRADA"
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "pending"
    completed_date: ""
    confidence: 0
    guides_count: 0
    notes: "Falta crear guía. MECANISMOS DE CONSERVACIÓN DE INFORMACIÓN NO CLAROS"

# 📊 Métricas de Evolución
evolution:
  current_layer: 1     # Última capa completada
  total_layers: 4
  completion_percentage: 25
  last_updated: "2026-03-22"
  next_milestone: "connections"
  
# 🔗 Relaciones con otros componentes
relationships:
  depends_on: ["useAccountDeletion", "Button", "Checkbox", "Input"]
  used_by: ["AccountSettingsPage", "AdminPanel"]
  similar_to: ["ConfirmationModal", "PasswordResetModal"]

# ⚠️ ESTADO ACTUAL DEL COMPONENTE
development_status:
  phase: "prototipo"
  uncertainty_level: "high"
  unknown_mechanisms:
    - "Eliminación de cuentas (mecanismos no definidos)"
    - "Eliminación de conversaciones asociadas"
    - "Eliminación/conservación de assets"
    - "Estrategia mínimo-máximo de eliminación"
    - "Conservación de información regulatoria"
  blockers:
    - "Backend mechanisms no implementados"
    - "Políticas de retención no definidas"
    - "Flujo de conservación de datos no claro"
---

# 🗑️ AccountDeletionModal Component

**Ubicación:** `apps/web/src/components/accounts/AccountDeletionModal.tsx`
**Tipo:** Smart Component (con estado y lógica de negocio)
**Propósito:** Modal multi-step para eliminación segura de cuentas con validación de contraseña y opciones de manejo de datos

---

## 🎯 **Propósito**

Componente React que implementa un flujo seguro de eliminación de cuentas con múltiples pasos de confirmación, validación de contraseña y opciones para manejo de datos. Gestiona el proceso completo desde la solicitud inicial hasta la eliminación final.

---

## 🧩 **Características Principales**

### **📋 Flujo Multi-Step:**
- **Intro:** Advertencia inicial sobre acción irreversible
- **Options:** Selección de manejo de datos (descargar vs eliminar todo)
- **Confirm:** Verificación de contraseña y consentimiento final

### **🔐 Seguridad:**
- **Verificación de contraseña:** Re-autenticación obligatoria
- **Consentimiento explícito:** Checkbox de confirmación irreversible
- **Validación de sesión:** Soporta owner/administradores

### **🎨 UX/UI:**
- **Modal overlay:** Fullscreen con backdrop
- **Estados de carga:** Indicadores visuales durante operaciones
- **Manejo de errores:** Mensajes de error claros y contextualizados
- **Responsive:** Adaptable a móviles y desktop

---

## 📊 **Estado y Datos**

### **Props (Interface):**
```typescript
interface AccountDeletionModalProps {
  account: Account;                    // Cuenta a eliminar
  sessionAccountId?: string | null;    // ID de sesión actual
  onClose: () => void;                // Callback al cerrar
}
```

### **Estado Interno:**
```typescript
const [passwordInput, setPasswordInput] = useState('');
const [finalConsent, setFinalConsent] = useState(false);
const [view, setView] = useState<'intro' | 'options' | 'confirm'>('intro');
```

### **Hooks Utilizados:**
- **`useAccountDeletion`:** Hook principal que gestiona toda la lógica de eliminación
- **`useState`:** Manejo de estado local del componente
- **`useEffect`:** Reset automático y sincronización con job status

---

## 🔄 **Flujos de Interacción**

### **🚀 Flujo Principal:**
1. **Intro:** Usuario hace click en "Continuar"
2. **Options:** Selecciona opción de datos (download/delete)
3. **Request:** Se crea job de eliminación asíncrono
4. **Confirm:** Ingresa contraseña y confirma consentimiento
5. **Delete:** Se ejecuta eliminación definitiva

### **🔄 Estados del Hook:**
- **`isRequesting`:** Creando job de eliminación
- **`isConfirming`:** Ejecutando eliminación final
- **`isPasswordVerified`:** Contraseña validada exitosamente
- **`selectedDataHandling`:** Opción elegida para datos
- **`job`:** Job asíncrono de eliminación

### **⚠️ Manejo de Errores:**
- **Error de contraseña:** Muestra mensaje y limpia input
- **Error de API:** Muestra error contextualizado
- **Error de job:** Maneja estados intermedios

---

## 🎨 **Implementación Técnica**

### **🏗️ Estructura del Componente:**
```tsx
export function AccountDeletionModal({ account, sessionAccountId, onClose }) {
  // Hook personalizado para lógica de eliminación
  const { ...deletionState } = useAccountDeletion({...});
  
  // Estado local para UI
  const [passwordInput, setPasswordInput] = useState('');
  const [finalConsent, setFinalConsent] = useState(false);
  const [view, setView] = useState<'intro' | 'options' | 'confirm'>('intro');
  
  // Handlers específicos del flujo
  const handleVerifyPassword = async () => { ... };
  const handleRequestWithPreference = async () => { ... };
  const handleFinalDeletion = async () => { ... };
  
  // Renderizado condicional por vista
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Modal con tres vistas condicionales */}
    </div>
  );
}
```

### **🎯 Puntos Clave:**
- **Estado centralizado en hook:** Toda la lógica de negocio en `useAccountDeletion`
- **Estado UI local:** Solo manejo de vistas y inputs del modal
- **Reset automático:** Limpia estado al cambiar de cuenta o job
- **Accesibilidad:** `role="dialog"`, `aria-modal="true"`

---

## 🔗 **Dependencias Externas**

### **Componentes UI:**
- **`Button`:** Botones de acción principal
- **`Checkbox`:** Consentimiento final
- **`Input`:** Campo de contraseña

### **Hooks Personalizados:**
- **`useAccountDeletion`:** Gestión completa del proceso de eliminación

### **Iconos:**
- **`AlertCircle`:** Indicador de error
- **`Loader2`:** Indicador de carga
- **`X`:** Botón de cerrar

### **Tipos:**
- **`Account`:** Tipo de datos de cuenta

---

## 📋 **Casos de Uso**

### **👤 Usuario Standard:**
1. Accede a configuración de cuenta
2. Click en "Eliminar cuenta"
3. Completa flujo de 3 pasos
4. Recibe confirmación de eliminación

### **👨‍💼 Administrador:**
1. Accede a panel de administración
2. Selecciona cuenta a eliminar
3. Usa credenciales de sesión
4. Elimina cuenta de usuario

### **🔄 Edge Cases:**
- **Cuenta con datos:** Ofrece opción de descarga
- **Error de contraseña:** Reintenta con mensaje claro
- **Job fallido:** Vuelve a opciones con error contextual

---

## 🎯 **Consideraciones de Diseño**

### **✅ Fortalezas:**
- **Seguridad multi-capa:** Contraseña + consentimiento
- **UX clara:** Flujo paso a paso con retroalimentación
- **Manejo robusto de errores:** Todos los estados cubiertos
- **Accesibilidad:** Roles ARIA y navegación por teclado

### **⚠️ Limitaciones:**
- **Dependencia de hook:** Requiere `useAccountDeletion` funcional
- **Modal fijo:** No personalizable en tamaño/posición
- **Texto estático:** Mensajes no internacionalizados

---

## 📊 **Métricas de Uso**

### **🔍 Eventos Rastreados:**
- **Inicio de flujo:** Click en "Continuar"
- **Selección de opciones:** Elección de manejo de datos
- **Intentos de eliminación:** Submit con contraseña
- **Errores:** Fallas de contraseña o API

### **📈 KPIs Relevantes:**
- **Tasa de conversión:** % que completa el flujo
- **Tasa de abandono:** % que cancela en cada paso
- **Tiempo de completado:** Duración promedio del proceso
- **Tasa de errores:** % de fallas en contraseña/API

---

**NOTA:** Este componente es crítico para la seguridad y retención de usuarios. Su correcto funcionamiento es esencial para cumplir con regulaciones de protección de datos (GDPR, etc.).
