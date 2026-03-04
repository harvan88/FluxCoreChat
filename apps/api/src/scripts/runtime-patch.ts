#!/usr/bin/env bun

/**
 * 🔍 PATCH RUNTIME PARA ANÁLISIS QUIRÚRGICO
 * 
 * Modifica ChatCoreGatewayService y Kernel en runtime para interceptar objetos reales
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: CANONICALIZACIÓN EXACTA (igual a kernel.ts)
// ═══════════════════════════════════════════════════════════

function canonicalize(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return '[' + value.map(canonicalize).join(',') + ']';
    }
    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + entries
        .map(([key, val]) => JSON.stringify(key) + ':' + canonicalize(val))
        .join(',') + '}';
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: VARIABLES GLOBALES PARA CAPTURA
// ═══════════════════════════════════════════════════════════

declare global {
    var __runtimeAnalysis: {
        runtimeSignedObject: any;
        runtimeCanonicalPayload: string;
        runtimeSignature: string;
        kernelValidatedObject: any;
        kernelCanonicalPayload: string;
        kernelExpectedSignature: string;
        captureEnabled: boolean;
    };
}

// Inicializar variables globales
global.__runtimeAnalysis = {
    runtimeSignedObject: null,
    runtimeCanonicalPayload: '',
    runtimeSignature: '',
    kernelValidatedObject: null,
    kernelCanonicalPayload: '',
    kernelExpectedSignature: '',
    captureEnabled: true
};

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PATCH DE ChatCoreGatewayService.signCandidate
// ═══════════════════════════════════════════════════════════

function patchChatCoreGateway() {
    console.log('🔍 PATCH: ChatCoreGatewayService.signCandidate');
    
    // Importar el servicio dinámicamente
    const chatCoreGatewayPath = './services/fluxcore/chatcore-gateway.service.ts';
    
    // Crear wrapper para la función signCandidate
    const originalSignCandidate = function(candidate: any, signingSecret: string): string {
        if (!global.__runtimeAnalysis.captureEnabled) {
            // Firma original si no estamos capturando
            const canonicalPayload = canonicalize({
                factType: candidate.factType,
                source: candidate.source,
                subject: candidate.subject || null,
                object: candidate.object || null,
                evidence: candidate.evidence,
                adapterId: candidate.certifiedBy.adapterId,
                adapterVersion: candidate.certifiedBy.adapterVersion,
            });
            
            return crypto
                .createHmac('sha256', signingSecret)
                .update(canonicalPayload)
                .digest('hex');
        }
        
        console.log('\n🔍 INTERCEPTOR RUNTIME: objeto ANTES de firmar');
        console.log('📋 OBJETO COMPLETO QUE SE VA A FIRMAR:');
        console.log(JSON.stringify(candidate, null, 2));
        
        // Calcular canonical payload exactamente como lo hace el kernel
        const canonicalPayload = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject || null,
            object: candidate.object || null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });
        
        console.log('\n📋 CANONICAL PAYLOAD RUNTIME:');
        console.log(canonicalPayload);
        
        const signature = crypto
            .createHmac('sha256', signingSecret)
            .update(canonicalPayload)
            .digest('hex');
        
        console.log('\n📋 FIRMA RUNTIME:');
        console.log(signature);
        
        // Guardar para análisis posterior
        global.__runtimeAnalysis.runtimeSignedObject = JSON.parse(JSON.stringify(candidate));
        global.__runtimeAnalysis.runtimeCanonicalPayload = canonicalPayload;
        global.__runtimeAnalysis.runtimeSignature = signature;
        
        return signature;
    };
    
    // Exportar la función patcheada
    return originalSignCandidate;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PATCH DE Kernel.ingestSignal
// ═══════════════════════════════════════════════════════════

function patchKernel() {
    console.log('🔍 PATCH: Kernel.ingestSignal');
    
    const patchedKernelIngest = function(candidate: any): number {
        if (!global.__runtimeAnalysis.captureEnabled) {
            // Lógica original del kernel si no estamos capturando
            return 1; // Placeholder
        }
        
        console.log('\n🔍 INTERCEPTOR KERNEL: objeto que llega para validación');
        console.log('📋 OBJETO COMPLETO QUE EL KERNEL RECIBE:');
        console.log(JSON.stringify(candidate, null, 2));
        
        // Calcular canonical payload exactamente como lo hace el kernel
        const canonicalPayload = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject || null,
            object: candidate.object || null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });
        
        console.log('\n📋 CANONICAL PAYLOAD KERNEL:');
        console.log(canonicalPayload);
        
        // Obtener adapter para firma esperada
        const adapter = {
            signingSecret: 'development_signing_secret_wa'
        };
        
        const expectedSignature = crypto
            .createHmac('sha256', adapter.signingSecret)
            .update(canonicalPayload)
            .digest('hex');
        
        console.log('\n📋 FIRMA ESPERADA POR KERNEL:');
        console.log(expectedSignature);
        
        console.log('\n📋 FIRMA RECIBIDA POR KERNEL:');
        console.log(candidate.certifiedBy.signature);
        
        // Guardar para análisis posterior
        global.__runtimeAnalysis.kernelValidatedObject = JSON.parse(JSON.stringify(candidate));
        global.__runtimeAnalysis.kernelCanonicalPayload = canonicalPayload;
        global.__runtimeAnalysis.kernelExpectedSignature = expectedSignature;
        
        // Simular validación del kernel
        if (expectedSignature !== candidate.certifiedBy.signature) {
            console.log('\n❌ ERROR EN KERNEL: Invalid reality adapter signature');
            throw new Error('Invalid reality adapter signature');
        }
        
        console.log('\n✅ KERNEL: Validación exitosa');
        return 1; // Signal ID simulado
    };
    
    return patchedKernelIngest;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: FUNCIÓN DE ANÁLISIS COMPARATIVO
// ═══════════════════════════════════════════════════════════

function analyzeRuntimeVsKernel() {
    console.log('\n🔍 ANÁLISIS QUIRÚRGICO: RUNTIME vs KERNEL');
    console.log('═══════════════════════════════════════════════════════════');
    
    const { 
        runtimeSignedObject, 
        runtimeCanonicalPayload, 
        runtimeSignature,
        kernelValidatedObject, 
        kernelCanonicalPayload, 
        kernelExpectedSignature 
    } = global.__runtimeAnalysis;
    
    if (!runtimeSignedObject || !kernelValidatedObject) {
        console.log('❌ NO SE CAPTURARON OBJETOS - ejecuta un mensaje real primero');
        return;
    }
    
    console.log('\n📋 COMPARACIÓN BYTE POR BYTE:');
    
    // 1. Comparar objetos completos
    const runtimeJson = JSON.stringify(runtimeSignedObject, null, 2);
    const kernelJson = JSON.stringify(kernelValidatedObject, null, 2);
    
    console.log('\n🔍 OBJETO RUNTIME:');
    console.log(runtimeJson);
    
    console.log('\n🔍 OBJETO KERNEL:');
    console.log(kernelJson);
    
    const objectsMatch = runtimeJson === kernelJson;
    console.log(`\n📋 OBJETOS IDÉNTICOS: ${objectsMatch ? '✅' : '❌'}`);
    
    // 2. Comparar canonical payloads
    console.log('\n📋 COMPARACIÓN DE CANONICAL PAYLOADS:');
    console.log(`\n🔍 RUNTIME CANONICAL:`);
    console.log(runtimeCanonicalPayload);
    console.log(`\n🔍 KERNEL CANONICAL:`);
    console.log(kernelCanonicalPayload);
    
    const canonicalsMatch = runtimeCanonicalPayload === kernelCanonicalPayload;
    console.log(`\n📋 CANONICALS IDÉNTICOS: ${canonicalsMatch ? '✅' : '❌'}`);
    
    // 3. Comparar firmas
    console.log('\n📋 COMPARACIÓN DE FIRMAS:');
    console.log(`\n🔍 FIRMA RUNTIME: ${runtimeSignature}`);
    console.log(`🔍 FIRMA ESPERADA: ${kernelExpectedSignature}`);
    console.log(`🔍 FIRMA RECIBIDA: ${kernelValidatedObject.certifiedBy.signature}`);
    
    const runtimeSignatureMatches = runtimeSignature === kernelExpectedSignature;
    const kernelSignatureMatches = kernelValidatedObject.certifiedBy.signature === kernelExpectedSignature;
    
    console.log(`\n📋 FIRMA RUNTIME VÁLIDA: ${runtimeSignatureMatches ? '✅' : '❌'}`);
    console.log(`📋 FIRMA KERNEL VÁLIDA: ${kernelSignatureMatches ? '✅' : '❌'}`);
    
    // 4. Análisis específico de meta.channel
    console.log('\n🔍 ANÁLISIS ESPECÍFICO: meta.channel');
    const runtimeChannel = runtimeSignedObject.evidence?.raw?.meta?.channel;
    const kernelChannel = kernelValidatedObject.evidence?.raw?.meta?.channel;
    
    console.log(`📋 CHANNEL RUNTIME: ${JSON.stringify(runtimeChannel)}`);
    console.log(`📋 CHANNEL KERNEL:  ${JSON.stringify(kernelChannel)}`);
    console.log(`📋 CHANNELS IDÉNTICOS: ${runtimeChannel === kernelChannel ? '✅' : '❌'}`);
    
    // 5. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO QUIRÚRGICO:');
    
    if (objectsMatch && canonicalsMatch && runtimeSignatureMatches && kernelSignatureMatches) {
        console.log('✅ TODO IDÉNTICO - el problema NO está en la morfología ni firma');
        console.log('🔍 POSIBLES CAUSAS RESTANTES:');
        console.log('  - Adapter registration en kernel');
        console.log('  - Driver ID mismatch');
        console.log('  - Adapter class validation');
        console.log('  - Database transaction error');
    } else if (!objectsMatch) {
        console.log('❌ OBJETOS DIFERENTES - el problema está entre firma y validación');
        console.log('🔍 POSIBLES CAUSAS:');
        console.log('  - Mutación del objeto entre firma y kernel');
        console.log('  - Diferente instancia del objeto');
        console.log('  - Modificación en el flujo');
    } else if (!canonicalsMatch) {
        console.log('❌ CANONICALS DIFERENTES - problema de canonicalización');
        console.log('🔍 POSIBLES CAUSAS:');
        console.log('  - Orden de keys diferente');
        console.log('  - Función canonicalize diferente');
        console.log('  - Encoding diferente');
    } else {
        console.log('❌ FIRMAS DIFERENTES - problema de firma');
        console.log('🔍 POSIBLES CAUSAS:');
        console.log('  - Secreto diferente');
        console.log('  - Algoritmo diferente');
        console.log('  - Timing issue');
    }
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: EXPORTACIONES
// ═══════════════════════════════════════════════════════════

export {
    patchChatCoreGateway,
    patchKernel,
    analyzeRuntimeVsKernel,
    canonicalize
};

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: EJECUCIÓN
// ═══════════════════════════════════════════════════════════

console.log('🔍 PATCH RUNTIME CARGADO');
console.log('📋 Para usar:');
console.log('  1. Importar { patchChatCoreGateway, patchKernel, analyzeRuntimeVsKernel }');
console.log('  2. Aplicar patches en runtime');
console.log('  3. Enviar un mensaje real');
console.log('  4. Ejecutar analyzeRuntimeVsKernel()');
