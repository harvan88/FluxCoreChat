#!/usr/bin/env bun

/**
 * 🔍 ANÁLISIS QUIRÚRGICO RUNTIME
 * 
 * Compara objeto real que se firma vs objeto que el kernel valida
 * Sin interpretaciones - solo evidencia byte por byte
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: INTERCEPTOR REAL DE ChatCoreGatewayService
// ═══════════════════════════════════════════════════════════

// Patch temporal para interceptar el objeto real que se firma
const originalSignCandidate = require('../services/fluxcore/chatcore-gateway.service.ts').signCandidate;

let runtimeSignedObject: any = null;
let runtimeCanonicalPayload: string = '';
let runtimeSignature: string = '';

function patchedSignCandidate(candidate: any, signingSecret: string): string {
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
    runtimeSignedObject = JSON.parse(JSON.stringify(candidate));
    runtimeCanonicalPayload = canonicalPayload;
    runtimeSignature = signature;
    
    // Llamar a la función original
    return originalSignCandidate(candidate, signingSecret);
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PATCH DEL KERNEL PARA INTERCEPTAR VALIDACIÓN
// ═══════════════════════════════════════════════════════════

const originalKernelIngest = require('../core/kernel.ts').ingestSignal;

let kernelValidatedObject: any = null;
let kernelCanonicalPayload: string = '';
let kernelExpectedSignature: string = '';

function patchedKernelIngest(candidate: any): number {
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
    kernelValidatedObject = JSON.parse(JSON.stringify(candidate));
    kernelCanonicalPayload = canonicalPayload;
    kernelExpectedSignature = expectedSignature;
    
    // Llamar a la función original
    try {
        return originalKernelIngest(candidate);
    } catch (error) {
        console.log('\n❌ ERROR EN KERNEL:');
        console.log(error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: FUNCIÓN DE CANONICALIZACIÓN EXACTA
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
// DOCUMENTACIÓN: ANÁLISIS COMPARATIVO
// ═══════════════════════════════════════════════════════════

function compareRuntimeVsKernel() {
    console.log('\n🔍 ANÁLISIS QUIRÚRGICO: RUNTIME vs KERNEL');
    console.log('═══════════════════════════════════════════════════════════');
    
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
    
    // 4. Análisis de diferencias específicas
    if (!objectsMatch) {
        console.log('\n🔍 ANÁLISIS DE DIFERENCIAS EN OBJETOS:');
        
        const runtimeKeys = Object.keys(runtimeSignedObject).sort();
        const kernelKeys = Object.keys(kernelValidatedObject).sort();
        
        console.log('📋 KEYS RUNTIME:', runtimeKeys);
        console.log('📋 KEYS KERNEL:', kernelKeys);
        
        // Comparar campo por campo
        const allKeys = new Set([...runtimeKeys, ...kernelKeys]);
        
        for (const key of allKeys) {
            const runtimeValue = runtimeSignedObject[key];
            const kernelValue = kernelValidatedObject[key];
            
            if (JSON.stringify(runtimeValue) !== JSON.stringify(kernelValue)) {
                console.log(`\n❌ DIFERENCIA EN CAMPO: ${key}`);
                console.log(`  RUNTIME: ${JSON.stringify(runtimeValue)}`);
                console.log(`  KERNEL:  ${JSON.stringify(kernelValue)}`);
            }
        }
    }
    
    // 5. Análisis específico de meta.channel
    console.log('\n🔍 ANÁLISIS ESPECÍFICO: meta.channel');
    const runtimeChannel = runtimeSignedObject.evidence?.raw?.meta?.channel;
    const kernelChannel = kernelValidatedObject.evidence?.raw?.meta?.channel;
    
    console.log(`📋 CHANNEL RUNTIME: ${JSON.stringify(runtimeChannel)}`);
    console.log(`📋 CHANNEL KERNEL:  ${JSON.stringify(kernelChannel)}`);
    console.log(`📋 CHANNELS IDÉNTICOS: ${runtimeChannel === kernelChannel ? '✅' : '❌'}`);
    
    // 6. Diagnóstico final
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
// DOCUMENTACIÓN: EJECUCIÓN
// ═══════════════════════════════════════════════════════════

console.log('🔍 ANÁLISIS QUIRÚRGICO RUNTIME INSTALADO');
console.log('📋 Para ejecutar: envía un mensaje real y luego corre compareRuntimeVsKernel()');

// Exportar funciones para uso manual
global.compareRuntimeVsKernel = compareRuntimeVsKernel;
global.getRuntimeData = () => ({ runtimeSignedObject, runtimeCanonicalPayload, runtimeSignature });
global.getKernelData = () => ({ kernelValidatedObject, kernelCanonicalPayload, kernelExpectedSignature });
