# Análisis de Riesgos: Refactoring packages/types

## 🚨 **Análisis de Consecuencias Negativas**

### **Riesgo Crítico: Romper Contratos Implícitos**

#### **1. Dependencies Ocultas**
```typescript
// Peligro: Alguien podría estar usando tipos sin import directo
interface CustomProcessor {
  processMessage(msg: Message); // Message podría venir de @fluxcore/types
}

// O podría estar usando tipado dinámico
const message = (data as any) as Message; // Sin import directo
```

#### **2. Type Inference Dependencies**
```typescript
// Peligro: Tipos inferidos que dependen de @fluxcore/types
const messages: Message[] = []; // Type inference global
// Si Message desaparece, esto rompe en cascada
```

#### **3. Build-time Dependencies**
```typescript
// Peligro: Configuraciones de build que esperan estos tipos
// tsconfig.json paths:
{
  "paths": {
    "@fluxcore/types": ["packages/types/src"]
  }
}
```

### **Riesgo Alto: Regresión en Runtime**

#### **1. Serialización/Deserialización**
```typescript
// Peligro: Código que asume estructura específica de @fluxcore/types
function serializeMessage(msg: Message): string {
  return JSON.stringify({
    type: msg.type,        // Si MessageType cambia, rompe
    content: msg.content,  // Si MessageContent cambia, rompe
  });
}
```

#### **2. Database Mappers**
```typescript
// Peligro: Mappers que convierten DB → Types
function mapDbToMessage(dbRow: any): Message {
  return {
    id: dbRow.id,
    type: dbRow.type as MessageType, // Cast específico
    // ... si MessageType desaparece, rompe
  };
}
```

#### **3. API Contracts**
```typescript
// Peligro: Endpoints que devuelven tipos de @fluxcore/types
app.get('/messages', () => {
  return messages as Message[]; // Si Message cambia, rompe API
});
```

### **Riesgo Medio: Herramientas y Desarrollo**

#### **1. IDE y Autocompletado**
```typescript
// Peligro: Configuraciones de IDE que dependen de estos tipos
// VSCode settings, TypeScript server, etc.
```

#### **2. Testing Frameworks**
```typescript
// Peligro: Tests que usan estos tipos para mocks
const mockMessage: Message = {
  // ... si Message desaparece, tests fallan
};
```

#### **3. Documentation Tools**
```typescript
// Peligro: Generadores de documentación que leen estos tipos
// TypeDoc, Swagger, etc.
```

## 🔍 **Análisis de Errores Potenciales**

### **Error 1: TypeScript Compilation Errors**
```bash
# Errores típicos que podríamos ver:
error TS2304: Cannot find name 'Message'.
error TS2694: Namespace '"/fluxcore/types"' has no exported member 'MessageType'.
error TS2742: Cannot find name 'MessageContent'. Did you mean 'MessageContent'?
```

**Impacto:** Build roto, desarrollo detenido

### **Error 2: Runtime Type Errors**
```javascript
// Errores en runtime:
TypeError: Cannot read properties of undefined (reading 'type')
TypeError: msg.content is not a function
ReferenceError: MessageType is not defined
```

**Impacto:** Aplicación rota en producción

### **Error 3: Database Mapping Errors**
```javascript
// Errores de mapeo:
Error: Invalid type conversion: expected MessageType, got string
Error: Cannot map database row to Message interface
```

**Impacto:** Corrupción de datos, pérdida de información

### **Error 4: API Contract Violations**
```javascript
// Errores de API:
Error: Response does not match expected schema
Error: Missing required field: 'type' in Message
```

**Impacto:** Clientes rotos, integraciones fallidas

### **Error 5: Test Failures**
```javascript
// Errores de tests:
Test suite failed to run: Cannot find module '@fluxcore/types'
TypeError: Cannot read properties of undefined (reading 'id')
```

**Impacto:** CI/CD roto, confianza perdida

## 🎯 **Estrategia de Migración Más Rápida y Cuidadosa**

### **Phase 0: Preparación Crítica**

#### **Paso 0.1: Baseline Completo**
```bash
# 1. Build baseline
bun run build > build-baseline.txt 2>&1

# 2. Test baseline  
bun run test > test-baseline.txt 2>&1

# 3. Runtime baseline
bun run dev &
# Probar funcionalidades críticas
# Guardar logs

# 4. Database schema backup
pg_dump fluxcore > schema-backup.sql
```

#### **Paso 0.2: Análisis de Dependencias Profundo**
```bash
# Buscar TODAS las referencias (no solo imports)
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "Message" | grep -v node_modules
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "MessageType" | grep -v node_modules
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "MessageContent" | grep -v node_modules

# Buscar referencias indirectas
find . -name "*.json" | xargs grep -l "@fluxcore/types"
find . -name "*.js" | xargs grep -l "MessageType"
```

#### **Paso 0.3: Branch Aislado**
```bash
git checkout -b refactor/cleanup-packages-types
git add .
git commit -m "Baseline before packages/types cleanup"
```

### **Phase 1: Migración Incremental (La Más Segura)**

#### **Opción 1A: Deprecation Gradual**
```typescript
// Phase 1: Marcar como deprecated pero mantener
// packages/types/src/entities/message.ts

/**
 * @deprecated Use database schema types instead. This will be removed in v2.0
 * Migration guide: Use types from packages/db/src/schema/messages.ts
 */
export type MessageType = 'incoming' | 'outgoing' | 'system';

/**
 * @deprecated Use database schema types instead. This will be removed in v2.0  
 * Migration guide: Use types from packages/db/src/schema/messages.ts
 */
export interface MessageContent { ... }
```

#### **Opción 1B: Alias Temporal**
```typescript
// Phase 1: Crear alias que apunten al schema DB
// packages/types/src/entities/message.ts

// Re-exportar desde el schema (la fuente de verdad real)
export type MessageType = import('@fluxcore/db').Message['type'];
export type MessageGeneratedBy = import('@fluxcore/db').Message['generatedBy'];

// Para MessageContent, necesitamos tipar el jsonb
export interface MessageContent {
  text: string;
  media?: import('@fluxcore/db').Message['content']['media'];
  location?: import('@fluxcore/db').Message['content']['location'];
  buttons?: import('@fluxcore/db').Message['content']['buttons'];
}
```

### **Phase 2: Migración Controlada**

#### **Paso 2.1: Migrar Importadores Uno por Uno**
```typescript
// Para cada archivo que importa @fluxcore/types:

// ANTES:
import { Message, MessageType } from '@fluxcore/types';

// DESPUÉS:
import { messages } from '@fluxcore/db';
type Message = typeof messages.$inferSelect;
type MessageType = Message['type'];
```

#### **Paso 2.2: Validación Después de Cada Cambio**
```bash
# Después de cada archivo migrado:
bun run build
bun run test
# Probar funcionalidad específica
git add . && git commit -m "Migrate Message types in ContactDetails.tsx"
```

#### **Paso 2.3: Actualización de Tests**
```typescript
// Migrar tests a usar tipos del schema
import { messages } from '@fluxcore/db';

const mockMessage = {
  id: 'test-id',
  type: 'incoming' as const,
  // ... usar tipos del schema
} satisfies typeof messages.$inferInsert;
```

### **Phase 3: Limpieza Final**

#### **Paso 3.1: Eliminación de Tipos Deprecated**
```typescript
// Una vez que todos los importadores están migrados:
// ELIMINAR packages/types/src/entities/message.ts
// ACTUALIZAR packages/types/src/index.ts
```

#### **Paso 3.2: Validación Completa**
```bash
# Build completo
bun run build

# Tests completos  
bun run test

# Runtime testing
bun run dev &
# Probar TODAS las funcionalidades

# Database validation
# Verificar que no hay corrupción de datos
```

## 🚀 **Estrategia Ultra-Rápida (Si hay Confianza)**

### **Opción 2A: Big Bang Controlado**
```typescript
// 1. Crear alias globales en un solo lugar
// packages/types/src/index.ts

// Re-exportar todo desde el schema DB
export type Message = import('@fluxcore/db').Message;
export type MessageType = Message['type'];
export type MessageContent = Message['content'];

// Mantener otros tipos que sí se usan
export * from './entities/account';
export * from './entities/relationship';
export * from './extensions';
```

### **Opción 2B: Eliminación Directa**
```typescript
// Si la búsqueda muestra 0 usos reales:
// 1. Eliminar directamente packages/types/src/entities/message.ts
// 2. Actualizar index.ts
// 3. Build y test
// 4. Si algo falla, revertir inmediatamente
```

## 🛡️ **Plan de Rollback Inmediato**

### **Rollback Automático**
```bash
# Si algo falla, rollback instantáneo:
git checkout main
git branch -D refactor/cleanup-packages-types
# Volver al baseline funcional
```

### **Rollback Selectivo**
```bash
# Si solo algunos cambios fallan:
git checkout HEAD~1 -- packages/types/src/entities/message.ts
git checkout HEAD~1 -- packages/types/src/index.ts
# Revertir solo archivos problemáticos
```

## 📋 **Checklist de Seguridad**

### **Pre-Migración**
- [ ] Baseline funcional documentado
- [ ] Todas las dependencias identificadas
- [ ] Branch aislado creado
- [ ] Plan de rollback listo

### **Durante Migración**
- [ ] Un archivo a la vez
- [ ] Build después de cada cambio
- [ ] Tests después de cada cambio
- [ ] Commits atómicos

### **Post-Migración**
- [ ] Build completo exitoso
- [ ] Tests completos pasando
- [ ] Runtime verificado
- [ ] Documentación actualizada

## 🎖️ **Lecciones de Seguridad**

1. **Nunca eliminar tipos sin verificar 100% de uso**
2. **Los tipos son contratos, romperlos es peligroso**
3. **La migración incremental es más segura que el big bang**
4. **El rollback debe ser instantáneo y automático**
5. **La fuente de verdad debe ser una sola (schema DB)**

---

> **"La migración más rápida no es la que elimina más rápido, es la que elimina con mayor seguridad."**
