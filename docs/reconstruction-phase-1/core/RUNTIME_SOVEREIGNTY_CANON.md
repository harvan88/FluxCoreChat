# Runtime Sovereignty Canon - Principios Fundamentales

**Fecha:** 2026-03-16  
**Estado:** ✅ **DOCUMENTO CANÓNICO** - Principios arquitectónicos de FluxCore

---

## 🎯 **Principio Fundamental: Soberanía del Usuario**

### **📋 Definición Canónica:**
**El usuario tiene control absoluto y soberano sobre qué runtime procesa sus mensajes. FluxCore NO decide, FluxCore RESPETA.**

---

## 🔍 **Contrato Arquitectónico (Canon v8.3)**

### **📋 Flujo Canónico:**
```
1. Usuario envía mensaje → Kernel certifica
2. FluxCore despierta (ChatProjector crea turno)
3. FluxCore respeta la decisión del usuario (RuntimeSwitcher)
   - Si usuario seleccionó FLUXI → usar @fluxcore/fluxi
   - Si usuario seleccionó ASISTENTES → usar asistente activo
4. Runtime responde de forma soberana
5. FluxCore certifica respuesta en Kernel
6. ChatCore entrega respuesta al usuario
```

### **🚨 Invariantes Sagradas:**

#### **🔒 Invariante 1: Soberanía del Runtime**
- **El usuario controla** qué runtime procesa sus mensajes
- **FluxCore nunca sobrescribe** la selección del usuario
- **No hay fallback automático** entre runtimes

#### **🔒 Invariante 2: Respeto a Decisión Explícita**
- **RuntimeSwitcher UI** es la única fuente de verdad para selección
- **account_runtime_config.active_runtime_id** almacena la decisión
- **CognitiveDispatcher** solo lee y respeta esta decisión

#### **🔒 Invariante 3: Separación de Responsabilidades**
- **Usuario:** Decide qué runtime usar
- **FluxCore:** Respeta y ejecuta con el runtime seleccionado
- **Runtime:** Responde de forma soberana según su configuración

---

## 🎯 **Componentes y Sus Responsabilidades**

### **📋 RuntimeSwitcher (UI)**
- **Responsabilidad:** Permitir al usuario seleccionar runtime
- **Acción:** Guardar selección en `account_runtime_config.active_runtime_id`
- **Opciones:** FLUXI (@fluxcore/fluxi) o ASISTENTES (@fluxcore/asistentes)

### **📋 CognitiveDispatcher (Respetador)**
- **Responsabilidad:** Leer y respetar la selección del usuario
- **Lógica:** 
  ```typescript
  const userSelection = runtimeConfig.activeRuntimeId;
  if (userSelection === '@fluxcore/fluxi') {
      runtimeId = '@fluxcore/fluxi';  // Respetar selección FLUXI
  } else if (userSelection === '@fluxcore/asistentes') {
      // Respetar selección ASISTENTES → usar asistente activo
      runtimeId = 'asistentes-local'; 
  }
  ```
- **Prohibido:** Modificar, ignorar o sobrescribir la selección del usuario

### **📋 RuntimeGateway (Ejecutor)**
- **Responsabilidad:** Invocar el runtime seleccionado por el usuario
- **Acción:** Delegar al runtime específico sin modificar la selección

### **📋 ActionExecutor (Mediador)**
- **Responsabilidad:** Ejecutar acciones del runtime seleccionado
- **Acción:** Pasar metadata del runtime a CognitionGateway

### **📋 CognitionGateway (Certificador)**
- **Responsabilidad:** Certificar respuestas con metadata correcta
- **Acción:** Incluir runtimeId, model, provider en las trazas

---

## 🚨 **Violaciones del Canon (Anti-Patrones)**

### **❌ Anti-Patrón 1: Decisión Automática**
```typescript
// INCORRECTO - FluxCore decide
if (conversation.type === 'support') {
    runtimeId = 'asistentes-local';  // Violación de soberanía
}
```

### **❌ Anti-Patrón 2: Fallback Automático**
```typescript
// INCORRECTO - Fallback sin consentimiento
if (!activeRuntime) {
    runtimeId = 'asistentes-local';  // Violación de soberanía
}
```

### **❌ Anti-Patrón 3: Ignorar Selección**
```typescript
// INCORRECTO - Ignorar decisión del usuario
const runtimeId = 'asistentes-local'; // Siempre usa asistentes
```

---

## ✅ **Patrones Canónicos Correctos**

### **✅ Patrón 1: Respeto Explícito**
```typescript
// CORRECTO - Respeta decisión del usuario
const userSelection = runtimeConfig.active_runtime_id;
if (userSelection === '@fluxcore/fluxi') {
    runtimeId = '@fluxcore/fluxi';
} else if (userSelection === '@fluxcore/asistentes') {
    const activeAssistant = await fluxcoreService.resolveActiveAssistant(accountId);
    runtimeId = mapRuntime(activeAssistant.runtime);
}
```

### **✅ Patrón 2: Propagación de Metadata**
```typescript
// CORRECTO - Propagar metadata del runtime seleccionado
const enrichedRuntimeConfig = {
    ...runtimeConfig,
    runtimeId: userSelection,
    model: executionPlan.model,
    provider: executionPlan.provider,
};
```

### **✅ Patrón 3: Trazabilidad Completa**
```typescript
// CORRECTO - Trazas con metadata correcta
await cognitionGateway.certifyAiResponse({
    runtimeId: context.runtimeConfig.runtimeId,
    model: context.runtimeConfig.model,
    provider: context.runtimeConfig.provider,
    // ... otros campos
});
```

---

## 🔍 **Validación de Cumplimiento**

### **📋 Checklist de Soberanía:**
- [ ] **RuntimeSwitcher** permite selección explícita
- [ ] **account_runtime_config** almacena decisión del usuario
- [ ] **CognitiveDispatcher** lee y respeta la decisión
- [ ] **No hay fallback automático** entre runtimes
- [ ] **Trazas muestran** runtimeId/model/provider correctos
- [ ] **Usuario puede cambiar** runtime en cualquier momento

### **📋 Pruebas de Regresión:**
1. **Seleccionar FLUXI** → Debe invocar @fluxcore/fluxi
2. **Seleccionar ASISTENTES** → Debe invocar asistente activo
3. **Cambiar selección** → Debe reflejar cambio inmediato
4. **Trazas Kernel** → Deben mostrar metadata correcta

---

## 🎯 **Principio de Diseño: "Usuario es el Rey"**

### **📋 Máxima Arquitectónica:**
**"El sistema debe ser un sirviente del usuario, no su dictador. El usuario siempre tiene la última palabra sobre qué runtime procesa sus mensajes."**

### **📋 Implicaciones Prácticas:**
- **UI siempre clara** sobre qué runtime está activo
- **Cambios inmediatos** cuando el usuario selecciona diferente runtime
- **Sin comportamiento sorpresa** o decisiones automáticas
- **Trazabilidad completa** para verificar respeto a la selección

---

## 🔄 **Estado Actual del Canon**

### **✅ Cumplido:**
- **RuntimeSwitcher UI** - Permite selección explícita
- **account_runtime_config** - Almacena decisión del usuario
- **CognitiveDispatcher** - Respeta selección (fix aplicado)

### **⏳ En Progreso:**
- **Propagación de metadata** - Fix aplicado pero necesita validación
- **Trazas correctas** - Pendiente de verificación

### **🎯 Próximo Paso:**
**Validar que las trazas muestren la metadata correcta del runtime seleccionado por el usuario.**

---

**Última actualización: 2026-03-16 19:40**  
**Estado:** ✅ **CANÓN DEFINITIVO** - Principios de soberanía del runtime establecidos
