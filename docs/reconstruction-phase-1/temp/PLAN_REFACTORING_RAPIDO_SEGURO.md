# Plan de Refactoring Rápido y Seguro - packages/types

## 🎯 **Objetivo**

Eliminar tipos duplicados de `packages/types` en **una sola sesión** de trabajo, con seguridad total y rollback inmediato.

## ⚡ **Estrategia: Big Bang Controlado (30-45 min)**

### **Phase 0: Preparación (5 min)**

#### **Paso 0.1: Baseline Rápido**
```bash
# 1. Crear branch
git checkout -b refactor/cleanup-packages-types

# 2. Build baseline
bun run build > build-before.txt 2>&1
echo "Build status: $?" >> build-before.txt

# 3. Baseline de funcionalidad crítica
bun run dev &
# Probar ContactDetails page (usa @fluxcore/types)
# Cerrar dev
```

#### **Paso 0.2: Verificación Final de Uso**
```bash
# Confirmar que solo hay 3 importadores
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "from.*@fluxcore/types" | grep -v node_modules
# Resultado esperado: manifest-loader.service.ts, permission-validator.service.ts, ContactDetails.tsx
```

### **Phase 1: Refactoring Central (15 min)**

#### **Paso 1.1: Crear Alias Globales (1 cambio)**
```typescript
// EDITAR: packages/types/src/index.ts
// REEMPLAZAR todo el contenido con:

// ============================================================================
// Tipos que SÍ se usan (mantener)
// ============================================================================
export * from './extensions/extension';
export * from './extensions/manifest';
export * from './extensions/permissions';
export * from './common/enums';
export * from './common/errors';

// ============================================================================
// Alias hacia fuente de verdad real (schema DB)
// ============================================================================
export type Message = import('@fluxcore/db').Message;
export type MessageType = Message['type'];
export type MessageGeneratedBy = Message['generatedBy'];
export type MessageContent = Message['content'];

// Tipos usados en ContactDetails.tsx (verificar)
export type Account = import('@fluxcore/db').Account;
export type Relationship = import('@fluxcore/db').Relationship;

// ============================================================================
// Servicios (mantener si se usan)
// ============================================================================
export * from './services/message-core';
export * from './services/persistence';
export * from './services/notification';
```

#### **Paso 1.2: Eliminar Archivos Duplicados (1 acción)**
```bash
# ELIMINAR archivos que contienen tipos duplicados
rm packages/types/src/entities/message.ts
rm packages/types/src/entities/conversation.ts
rm packages/types/src/entities/user.ts
rm packages/types/src/entities/workspace.ts

# MANTENER solo los que tienen uso real:
# - packages/types/src/entities/account.ts (usado en ContactDetails)
# - packages/types/src/entities/relationship.ts (usado en ContactDetails)
```

#### **Paso 1.3: Verificación Inmediata**
```bash
# Build después del cambio principal
bun run build
# Si hay errores, rollback inmediato:
# git checkout -- packages/types/src/index.ts
# git checkout HEAD~1 -- packages/types/src/entities/
```

### **Phase 2: Validación Rápida (10 min)**

#### **Paso 2.1: Verificación Crítica**
```bash
# 1. Build completo
bun run build

# 2. Verificar archivos específicos que importan @fluxcore/types
# - ContactDetails.tsx debe seguir funcionando
# - manifest-loader.service.ts debe seguir funcionando  
# - permission-validator.service.ts debe seguir funcionando

# 3. Runtime check
bun run dev &
# Probar ContactDetails page
# Probar carga de manifiestos
# Probar validación de permisos
```

#### **Paso 2.2: Si algo falla - Rollback Automático**
```bash
# Rollback completo
git checkout main
git branch -D refactor/cleanup-packages-types
# Volver al estado funcional
```

### **Phase 3: Limpieza Final (5 min)**

#### **Paso 3.1: Si todo funciona - Commit**
```bash
git add .
git commit -m "refactor: clean up packages/types - remove duplicates, use DB schema as source of truth"
```

#### **Paso 3.2: Verificación Final**
```bash
# Build final
bun run build

# Verificar que no hay imports rotos
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "from.*@fluxcore/types" | xargs grep -l "Cannot find"
```

## 🚨 **Plan de Rollback Inmediato**

### **Si Build Falla**
```bash
# Rollback al último commit funcional
git reset --hard HEAD~1
# O volver a main
git checkout main
```

### **Si Runtime Falla**
```bash
# Detener dev
# Rollback
git checkout main
# Reiniciar dev
```

### **Si Solo Algunos Archivos Fallan**
```bash
# Rollback selectivo
git checkout HEAD~1 -- packages/types/src/index.ts
git checkout HEAD~1 -- packages/types/src/entities/
```

## 📋 **Checklist de Seguridad (Rápido)**

### **✅ Pre-Cambio (5 min)**
- [ ] Branch creado
- [ ] Build baseline guardado
- [ ] Uso de @fluxcore/types confirmado (3 archivos)

### **✅ Durante Cambio (15 min)**
- [ ] Alias globales creados en index.ts
- [ ] Archivos duplicados eliminados
- [ ] Build verificado después del cambio

### **✅ Post-Cambio (10 min)**
- [ ] Build completo exitoso
- [ ] ContactDetails funciona
- [ ] Manifest loading funciona
- [ ] Permission validation funciona

## ⚡ **Por qué esta estrategia es rápida y segura**

### **Rápida**
- **1 solo cambio principal**: Editar index.ts
- **1 sola acción de eliminación**: rm archivos duplicados
- **Validación inmediata**: Build después de cada paso
- **Total**: 30-45 minutos

### **Segura**
- **Rollback automático**: Si algo falla, volver a main en 10 segundos
- **Alias hacia fuente de verdad**: Schema DB es la fuente real
- **Mantenemos tipos usados**: Account, Relationship, extensions
- **Validación incremental**: Build después de cada cambio

## 🎯 **Resultado Esperado**

### **Antes**
```
packages/types/src/entities/
├── message.ts     ❌ Duplicado, no se usa
├── conversation.ts❌ Duplicado, no se usa  
├── user.ts        ❌ Duplicado, no se usa
├── account.ts     ✅ Se usa en ContactDetails
└── relationship.ts✅ Se usa en ContactDetails
```

### **Después**
```
packages/types/src/
├── index.ts       ✅ Alias hacia schema DB + tipos usados
├── entities/
│   ├── account.ts     ✅ Se mantiene
│   └── relationship.ts✅ Se mantiene
├── extensions/     ✅ Se mantiene
└── common/         ✅ Se mantiene
```

## 🚀 **Comandos de Ejecución (Copy-Paste)**

```bash
# 1. Preparación
git checkout -b refactor/cleanup-packages-types
bun run build > build-before.txt 2>&1

# 2. Editar index.ts (manualmente con el contenido de arriba)

# 3. Eliminar duplicados
rm packages/types/src/entities/message.ts
rm packages/types/src/entities/conversation.ts  
rm packages/types/src/entities/user.ts
rm packages/types/src/entities/workspace.ts

# 4. Verificar
bun run build

# 5. Si funciona, commit
git add .
git commit -m "refactor: clean up packages/types - remove duplicates, use DB schema as source of truth"

# 6. Si falla, rollback
git checkout main
git branch -D refactor/cleanup-packages-types
```

---

> **"La rapidez con seguridad viene de tener un rollback instantáneo y una fuente de verdad clara."**
