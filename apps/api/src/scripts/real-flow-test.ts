#!/usr/bin/env bun

/**
 * 🔍 PRUEBA DEL FLUJO REAL COMPLETO
 * 
 * Usa el ChatCoreGatewayService real y el Kernel real
 * con interceptores para capturar objetos exactos
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: VARIABLES GLOBALES PARA CAPTURA REAL
// ═══════════════════════════════════════════════════════════

declare global {
    var __realFlowCapture: {
        gatewayInput: any;
        gatewayOutput: any;
        kernelInput: any;
        captureEnabled: boolean;
    };
}

global.__realFlowCapture = {
    gatewayInput: null,
    gatewayOutput: null,
    kernelInput: null,
    captureEnabled: true
};

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
// DOCUMENTACIÓN: INTERCEPTOR REAL DE ChatCoreGatewayService
// ═══════════════════════════════════════════════════════════

function interceptChatCoreGateway() {
    console.log('🔍 INTERCEPTOR: ChatCoreGatewayService.certifyIngress');
    
    // Importar el servicio real
    const { ChatCoreGatewayService } = require('./services/fluxcore/chatcore-gateway.service.ts');
    
    // Crear instancia real
    const gateway = new ChatCoreGatewayService();
    
    // Wrapper del método real
    const originalCertifyIngress = gateway.certifyIngress.bind(gateway);
    
    gateway.certifyIngress = async function(params: any) {
        if (!global.__realFlowCapture.captureEnabled) {
            return originalCertifyIngress(params);
        }
        
        console.log('\n🔍 INTERCEPTOR REAL: ChatCoreGatewayService.certifyIngress llamado');
        console.log('📋 INPUT REAL:');
        console.log(JSON.stringify(params, null, 2));
        
        // Capturar input
        global.__realFlowCapture.gatewayInput = JSON.parse(JSON.stringify(params));
        
        // Llamar al método real
        try {
            const result = await originalCertifyIngress(params);
            
            console.log('📋 OUTPUT REAL:');
            console.log(JSON.stringify(result, null, 2));
            
            // Capturar output
            global.__realFlowCapture.gatewayOutput = JSON.parse(JSON.stringify(result));
            
            return result;
        } catch (error: any) {
            console.log('❌ ERROR REAL EN GATEWAY:', error.message);
            throw error;
        }
    };
    
    return gateway;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: INTERCEPTOR REAL DEL KERNEL
// ═══════════════════════════════════════════════════════════

function interceptKernel() {
    console.log('🔍 INTERCEPTOR: Kernel.ingestSignal');
    
    // Importar el kernel real
    const { ingestSignal } = require('./core/kernel.ts');
    
    // Wrapper del método real
    const wrappedIngestSignal = async function(candidate: any): Promise<number> {
        if (!global.__realFlowCapture.captureEnabled) {
            return ingestSignal(candidate);
        }
        
        console.log('\n🔍 INTERCEPTOR REAL: Kernel.ingestSignal llamado');
        console.log('📋 INPUT REAL DEL KERNEL:');
        console.log(JSON.stringify(candidate, null, 2));
        
        // Capturar input del kernel
        global.__realFlowCapture.kernelInput = JSON.parse(JSON.stringify(candidate));
        
        // Llamar al método real
        try {
            const result = await ingestSignal(candidate);
            console.log('✅ KERNEL REAL: Validación exitosa - Signal ID:', result);
            return result;
        } catch (error: any) {
            console.log('❌ ERROR REAL EN KERNEL:', error.message);
            throw error;
        }
    };
    
    return wrappedIngestSignal;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: ANÁLISIS DEL FLUJO REAL
// ═══════════════════════════════════════════════════════════

function analyzeRealFlow() {
    console.log('\n🔍 ANÁLISIS DEL FLUJO REAL COMPLETO');
    console.log('═══════════════════════════════════════════════════════════');
    
    const { gatewayInput, gatewayOutput, kernelInput } = global.__realFlowCapture;
    
    if (!gatewayInput || !gatewayOutput || !kernelInput) {
        console.log('❌ NO SE CAPTURARON DATOS - ejecuta un mensaje real primero');
        return;
    }
    
    console.log('\n📋 ANÁLISIS DEL FLUJO REAL:');
    
    // 1. Input del Gateway
    console.log('\n🔍 1. INPUT DEL ChatCoreGatewayService:');
    console.log(JSON.stringify(gatewayInput, null, 2));
    
    // 2. Output del Gateway
    console.log('\n🔍 2. OUTPUT DEL ChatCoreGatewayService:');
    console.log(JSON.stringify(gatewayOutput, null, 2));
    
    // 3. Input del Kernel
    console.log('\n🔍 3. INPUT DEL Kernel:');
    console.log(JSON.stringify(kernelInput, null, 2));
    
    // 4. Análisis de meta.channel
    console.log('\n🔍 4. ANÁLISIS DE meta.channel:');
    const gatewayChannel = gatewayInput.meta?.channel;
    const kernelChannel = kernelInput.evidence?.raw?.meta?.channel;
    
    console.log(`📋 CHANNEL EN GATEWAY INPUT: ${JSON.stringify(gatewayChannel)}`);
    console.log(`📋 CHANNEL EN KERNEL INPUT:  ${JSON.stringify(kernelChannel)}`);
    console.log(`📋 CHANNELS COINCIDEN: ${gatewayChannel === kernelChannel ? '✅' : '❌'}`);
    
    // 5. Verificar si el kernel recibió el objeto correcto
    console.log('\n🔍 5. VERIFICACIÓN DE OBJETO KERNEL:');
    
    // Reconstruir lo que el gateway debería haber enviado
    const expectedKernelInput = {
        factType: 'chatcore.message.received',
        source: {
            namespace: '@fluxcore/internal',
            key: gatewayInput.accountId
        },
        subject: {
            namespace: '@fluxcore/internal',
            key: gatewayInput.accountId
        },
        evidence: {
            raw: {
                payload: gatewayInput.payload,
                accountId: gatewayInput.accountId,
                userId: gatewayInput.userId,
                meta: gatewayInput.meta
            },
            format: 'json',
            provenance: {
                driverId: 'chatcore-gateway',
                externalId: gatewayInput.meta?.requestId,
                entryPoint: 'api/messages'
            },
            claimedOccurredAt: gatewayInput.meta?.clientTimestamp ? new Date(gatewayInput.meta.clientTimestamp) : new Date()
        },
        certifiedBy: {
            adapterId: 'fluxcore/whatsapp-gateway',
            adapterVersion: '1.0.0',
            signature: kernelInput.certifiedBy?.signature || ''
        }
    };
    
    console.log('\n📋 OBJETO ESPERADO POR KERNEL:');
    console.log(JSON.stringify(expectedKernelInput, null, 2));
    
    console.log('\n📋 OBJETO REAL RECIBIDO POR KERNEL:');
    console.log(JSON.stringify(kernelInput, null, 2));
    
    // Comparar objetos
    const expectedJson = JSON.stringify(expectedKernelInput, null, 2);
    const realJson = JSON.stringify(kernelInput, null, 2);
    
    const objectsMatch = expectedJson === realJson;
    console.log(`\n📋 OBJETOS IDÉNTICOS: ${objectsMatch ? '✅' : '❌'}`);
    
    if (!objectsMatch) {
        console.log('\n❌ HAY DIFERENCIAS - EL PROBLEMA ESTÁ EN EL FLUJO REAL');
        
        // Analizar diferencias campo por campo
        const expectedKeys = Object.keys(expectedKernelInput).sort();
        const realKeys = Object.keys(kernelInput).sort();
        
        console.log('📋 KEYS ESPERADAS:', expectedKeys);
        console.log('📋 KEYS REALES:', realKeys);
        
        const allKeys = new Set([...expectedKeys, ...realKeys]);
        
        for (const key of allKeys) {
            const expectedValue = expectedKernelInput[key as keyof typeof expectedKernelInput];
            const realValue = kernelInput[key as keyof typeof kernelInput];
            
            if (JSON.stringify(expectedValue) !== JSON.stringify(realValue)) {
                console.log(`\n❌ DIFERENCIA EN CAMPO: ${key}`);
                console.log(`  ESPERADO: ${JSON.stringify(expectedValue)}`);
                console.log(`  REAL:     ${JSON.stringify(realValue)}`);
            }
        }
    } else {
        console.log('\n✅ OBJETOS IDÉNTICOS - EL FLUJO ES CORRECTO');
    }
    
    // 6. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL DEL FLUJO REAL:');
    
    if (gatewayOutput.accepted && objectsMatch) {
        console.log('✅ FLUJO REAL FUNCIONA PERFECTAMENTE');
        console.log('🔍 EL PROBLEMA DEBE ESTAR EN OTRO LADO');
    } else if (!gatewayOutput.accepted) {
        console.log('❌ GATEWAY RECHAZÓ EL MENSAJE');
        console.log(`🔍 RAZÓN: ${gatewayOutput.reason}`);
    } else if (!objectsMatch) {
        console.log('❌ EL OBJETO QUE LLEGÓ AL KERNEL NO ES EL ESPERADO');
        console.log('🔍 EL PROBLEMA ESTÁ EN LA TRANSFORMACIÓN GATEWAY → KERNEL');
    }
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PRUEBA DEL FLUJO REAL
// ═══════════════════════════════════════════════════════════

async function testRealFlow() {
    console.log('\n🔍 PRUEBA DEL FLUJO REAL COMPLETO');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // 1. Aplicar interceptores
        console.log('\n📋 1. Aplicando interceptores reales...');
        
        const gateway = interceptChatCoreGateway();
        const kernel = interceptKernel();
        
        console.log('✅ Interceptores aplicados');
        
        // 2. Preparar datos reales (sin channel para probar el problema)
        console.log('\n📋 2. Preparando datos reales...');
        
        const realParams = {
            accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
            userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
            payload: { text: 'Mensaje real desde flujo' },
            meta: {
                conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
                requestId: 'real-flow-' + Date.now(),
                clientTimestamp: new Date().toISOString(),
                ip: '127.0.0.1',
                userAgent: 'Real Flow Test'
                // 🔑 SIN CHANNEL - ESTO ES LO QUE QUIERO PROBAR
            }
        };
        
        console.log('📋 PARÁMETROS REALES (SIN CHANNEL):');
        console.log(JSON.stringify(realParams, null, 2));
        
        // 3. Ejecutar flujo real
        console.log('\n📋 3. Ejecutiendo flujo real...');
        
        const result = await gateway.certifyIngress(realParams);
        
        console.log('\n✅ FLUJO REAL COMPLETADO');
        console.log('📋 RESULTADO:', result);
        
        // 4. Analizar resultados
        console.log('\n📋 4. Analizando resultados del flujo real...');
        analyzeRealFlow();
        
    } catch (error: any) {
        console.error('❌ Error en flujo real:', error.message);
    }
}

// Ejecutar prueba
testRealFlow();
