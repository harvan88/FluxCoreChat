import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 📋 ACTUALIZADOR DEL ESTADO ACTUAL DEL KERNEL
 * 
 * ÚNICO SCRIPT OFICIAL para mantener el snapshot actualizado
 * SIN interpretaciones hardcodeadas - SIEMPRE DINÁMICO
 * 
 * USO:
 *   bun run src/scripts/update-snapshot.ts
 * 
 * RESULTADO:
 *   src/CURRENT_STATE_SNAPSHOT.md (siempre actualizado)
 */

const basePath = 'c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src';

// Archivos críticos (solo código, sin análisis)
const criticalFiles = [
    // Kernel Core
    'core/kernel.ts',
    'core/types.ts',
    'core/message-core.ts',
    
    // Projectors
    'core/projections/chat-projector.ts',
    'core/kernel/base.projector.ts',
    
    // ChatCore Services
    'services/fluxcore/chatcore-gateway.service.ts',
    'services/fluxcore/chatcore-webchat-gateway.service.ts',
    'services/fluxcore/reality-adapter.service.ts',
    'services/fluxcore/identity-projector.service.ts',
    'services/fluxcore/action-executor.service.ts',
    'services/fluxcore/cognitive-dispatcher.service.ts',
    
    // ChatCore World Definer
    'core/chatcore-world-definer.ts',
    
    // Outbox
    'services/chatcore-outbox.service.ts',
    
    // Routes
    'routes/messages.routes.ts',
    'routes/fluxcore-runtime.routes.ts',
    
    // Database Schema
    '../../packages/db/src/schema/fluxcore-projector-errors.ts',
];

async function updateSnapshot() {
    console.log('🔍 Actualizando snapshot del estado actual...');
    
    let content = `# CURRENT STATE SNAPSHOT

## 📋 ESTADO ACTUAL DEL KERNEL

*Fecha de actualización: ${new Date().toISOString()}*
*Total de archivos: ${criticalFiles.length}*
*Tipo: 🌍 DINÁMICO - SIN INTERPRETACIONES HARCODEADAS*
*Análisis: Se hace al leer, no al escribir*
*Script: bun run src/scripts/update-snapshot.ts*
----

## 📋 CÓMO USAR ESTE SNAPSHOT:

### 🔍 **PARA ANÁLISIS DE SOBERANÍA:**
1. **Buscar "ingestSignal"** → Ctrl+F para encontrar todos los call sites
2. **Buscar "kernel.ingestSignal"** → Verificar llamadas directas
3. **Buscar "messageService.createMessage"** → Verificar orden de persistencia
4. **Buscar "certifyIngress"** → Verificar flujo de certificación

### 🔍 **PARA ANÁLISIS DE WORLD DEFINER:**
1. **Buscar "ChatCoreWorldDefiner"** → Verificar implementación
2. **Buscar "defineWorld"** → Verificar lógica centralizada
3. **Buscar "resolveChannel"** → Verificar detección de canales

### 🔍 **PARA ANÁLISIS DE PROJECTORS:**
1. **Buscar "projectMessage"** → Verificar procesamiento
2. **Buscar "worldContext"** → Verificar uso de metadata
3. **Buscar "routing"** → Verificar decisiones de routing

---

## 🚨 NO CONTIENE INTERPRETACIONES ESTÁTICAS

### ❌ **LO QUE NO TIENE:**
- **Análisis hardcodeado** de soberanía
- **Call sites estáticos** que quedan desactualizados
- **Estado predefinido** que no refleja cambios
- **Interpretaciones** que pueden ser incorrectas

### ✅ **LO QUE SÍ TIENE:**
- **Código fuente** completo y actualizado
- **Búsqueda dinámica** de patrones
- **Análisis en tiempo real** al leerlo
- **Referencia exacta** del estado actual

---

`;

    try {
        for (const file of criticalFiles) {
            const filePath = join(basePath, file);
            console.log(`📁 Procesando: ${file}`);
            
            try {
                const fileContent = readFileSync(filePath, 'utf-8');
                const relativePath = file.replace(/^.*\//, '');
                
                content += `## 📁 ${relativePath}

\`\`\`typescript
${fileContent}
\`\`\`

---
`;
                
            } catch (error) {
                console.warn(`⚠️ No se pudo leer ${file}:`, error.message);
                const relativePath = file.replace(/^.*\//, '');
                content += `## 📁 ${relativePath}

❌ **ARCHIVO NO ENCONTRADO**

---
`;
            }
        }
        
        // Agregar guía de análisis dinámico
        content += `## 🔍 GUÍA DE ANÁLISIS DINÁMICO

### 📋 **BÚSQUEDAS CLAVE (Ctrl+F):**

#### **🚨 SOBERANÍA:**
- **"ingestSignal"** → Todos los call sites
- **"kernel.ingestSignal"** → Llamadas directas al Kernel
- **"messageService.createMessage"** → Persistencia de mensajes
- **"certifyIngress"** → Flujo de certificación

#### **🌍 WORLD DEFINER:**
- **"ChatCoreWorldDefiner"** → Implementación centralizada
- **"defineWorld"** → Lógica de definición del mundo
- **"resolveChannel"** → Detección de canales
- **"WorldContext"** → Tipo de contexto completo

#### **🔄 PROJECTORS:**
- **"projectMessage"** → Procesamiento de mensajes
- **"worldContext"** → Uso de metadata del Gateway
- **"routing"** → Decisiones de routing
- **"skipProcessing"** → Casos especiales

#### **📊 FLUJO COMPLETO:**
- **"messageCore.receive"** → Recepción de mensajes
- **"chatcoreOutboxService"** → Procesamiento asíncrono
- **"signal.evidenceRaw"** → Evidencia cruda
- **"signalId"** → Vinculación mensaje-señal

### 🎯 **ANÁLISIS DE ESTADO ACTUAL:**

#### **✅ **SI ENCUENTRAS:**
- **"messageService.createMessage" ANTES de "kernel.ingestSignal"** → Soberanía preservada
- **"ChatCoreWorldDefiner.defineWorld"** → Autoridad centralizada
- **"worldContext?.channel"** → Uso de metadata completa

#### **❌ **SI ENCUENTRAS:**
- **"kernel.ingestSignal" ANTES de persistencia** → Soberanía comprometida
- **"channel = 'web'" hardcodeado** → Hardcodeos pendientes
- **Múltiples "ingestSignal" sin control** → Call sites dispersos

---

## 🎯 **ESTE SNAPSHOT SIEMPRE ESTÁ ACTUALIZADO**

### 📋 **POR QUÉ ES DINÁMICO:**
- **Sin interpretaciones estáticas** que quedan obsoletas
- **Código fuente real** que refleja el estado actual
- **Búsquedas en tiempo real** para análisis preciso
- **Referencia viva** que evoluciona con el código

### 🔄 **CUÁNDO ACTUALIZAR:**
- **Después de cambios críticos** en el flujo
- **Antes de continuar** con siguiente fase
- **Para documentación** del estado actual
- **Para análisis** de regresión

---

*Snapshot dinámico actualizado: ${new Date().toISOString()}*
*Tipo: 🌍 DINÁMICO - SIN INTERPRETACIONES HARCODEADAS*
*Análisis: Se hace al leer, no al escribir*
*Próxima actualización: Cuando sea necesario*
`;

        // Escribir archivo
        const outputPath = join(basePath, 'CURRENT_STATE_SNAPSHOT.md');
        writeFileSync(outputPath, content, 'utf-8');
        
        console.log('✅ Snapshot DINÁMICO actualizado exitosamente');
        console.log(`📁 Archivo: ${outputPath}`);
        console.log(`📊 Archivos procesados: ${criticalFiles.length}`);
        console.log(`🌍 Tipo: DINÁMICO - SIN HARCODEOS`);
        
    } catch (error) {
        console.error('❌ Error en compilación:', error);
    }
}

updateSnapshot().catch(console.error);
