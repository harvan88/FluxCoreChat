
import { templateRegistryService } from '../apps/api/src/services/fluxcore/template-registry.service';

// 🧪 MOCKUP DE DATOS CONTROLADOS (Sin ruido de usuario)
const MOCK_PRIVATE_CONTEXT = `
### 1. IDENTIDAD
Soy un asistente de prueba.
### 2. LENGUAJE
Hablo de forma clara.
### 3. REGLAS DE NEGOCIO
No invento precios.
### 4. PROTOCOLO DE CONOCIMIENTO
Usa siempre plantillas. PRIORIDAD ABSOLUTA.
`.trim();

function simulatePhase3Assembly(matchedTemplateIds: string[], context: string) {
    const isStalled = matchedTemplateIds.includes('0000');
    
    console.log(`\n--- SIMULACIÓN FASE 3 ---`);
    console.log(`Estado: ${isStalled ? '🚨 INCOHERENTE (Bucle)' : '✅ COHERENTE'}`);

    let systemPrompt = "";
    
    if (isStalled) {
        // Lógica de extracción quirúrgica
        const businessLegacy = context.split(/(?=###?\s*4|###?\s*PROTOCOLO|Protocolo de Conocimiento)/i)[0].trim();
        
        const identity = `## Sistema de Instrucciones (Modo Resolución)\n${businessLegacy}`;
        const directive = `\n\n⚠️ INSTRUCCIÓN CRÍTICA DE MEJORA DE INTERPRETACIÓN:\nSe ha detectado un bucle. Se prohíbe el uso de plantillas técnicas.\n1. DETÉN el bucle de repetición.\n2. ADMITE el estancamiento de forma cordial.`;
        
        systemPrompt = identity + directive;
    } else {
        systemPrompt = `## Identidad Estándar\n${context}\n\nProtocolo de Respuesta: Usa CALL_TEMPLATE.`;
    }

    return systemPrompt;
}

// 🏃‍♂️ EJECUCIÓN DE PRUEBAS

// Prueba 1: Estado Normal
const resultNormal = simulatePhase3Assembly(["9EB1"], MOCK_PRIVATE_CONTEXT);
console.log("\n[TEST 1] RESULTADO NORMAL:");
console.log(resultNormal);

// Prueba 2: Estado de Conflicto (Antibucle)
const resultConflict = simulatePhase3Assembly(["9EB1", "0000"], MOCK_PRIVATE_CONTEXT);
console.log("\n[TEST 2] RESULTADO CONFLICTO (Antibucle):");
console.log(resultConflict);

// VALIDACIONES AUTOMÁTICAS
console.log("\n--- VERIFICACIÓN DE SOBERANÍA ---");
const hasPoint4InConflict = resultConflict.includes("### 4.");
const hasDirectiveInConflict = resultConflict.includes("INSTRUCCIÓN CRÍTICA");
const hasPoint3InConflict = resultConflict.includes("### 3. REGLAS DE NEGOCIO");

console.log(`¿Punto 4 eliminado?: ${!hasPoint4InConflict ? '✅ SÍ' : '❌ NO'}`);
console.log(`¿Directiva inyectada?: ${hasDirectiveInConflict ? '✅ SÍ' : '❌ NO'}`);
console.log(`¿Negocio (Punto 3) preservado?: ${hasPoint3InConflict ? '✅ SÍ' : '❌ NO'}`);

if (!hasPoint4InConflict && hasDirectiveInConflict && hasPoint3InConflict) {
    console.log("\n✨ LÓGICA VALIDADA: El sistema es capaz de discriminar estados sin ruido externo.");
} else {
    console.error("\n🚨 FALLO DE LÓGICA: El ensamblaje no es determinista.");
}
