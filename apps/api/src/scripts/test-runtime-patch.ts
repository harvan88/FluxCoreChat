#!/usr/bin/env bun

/**
 * 🔍 PRUEBA DE PATCH RUNTIME
 * 
 * Aplica patches y ejecuta un mensaje real para capturar objetos
 */

import { patchChatCoreGateway, patchKernel, analyzeRuntimeVsKernel } from './runtime-patch';

async function testRuntimePatch() {
    console.log('\n🔍 PRUEBA DE PATCH RUNTIME');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // 1. Aplicar patches
        console.log('\n📋 1. Aplicando patches...');
        
        // Patch de ChatCoreGateway
        const patchedSignCandidate = patchChatCoreGateway();
        console.log('✅ ChatCoreGateway patcheado');
        
        // Patch de Kernel
        const patchedKernelIngest = patchKernel();
        console.log('✅ Kernel patcheado');
        
        // 2. Simular un mensaje real
        console.log('\n📋 2. Simulando mensaje real...');
        
        // Datos de prueba reales
        const testParams = {
            accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
            userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
            payload: { text: 'Hola mundo desde runtime patch' },
            meta: {
                conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
                requestId: 'runtime-patch-' + Date.now(),
                clientTimestamp: new Date().toISOString(),
                ip: '127.0.0.1',
                userAgent: 'Runtime Patch Test',
                channel: 'web' // 🔑 ESTE ES EL CAMPO CLAVE
            }
        };
        
        console.log('📋 PARÁMETROS DE PRUEBA:');
        console.log(JSON.stringify(testParams, null, 2));
        
        // 3. Construir candidate como lo hace ChatCoreGateway
        console.log('\n📋 3. Construyendo candidate...');
        
        const candidate = {
            factType: 'chatcore.message.received',
            source: {
                namespace: '@fluxcore/internal',
                key: testParams.accountId
            },
            subject: {
                namespace: '@fluxcore/internal',
                key: testParams.accountId
            },
            evidence: {
                raw: {
                    payload: testParams.payload,
                    accountId: testParams.accountId,
                    userId: testParams.userId,
                    meta: testParams.meta
                },
                format: 'json',
                provenance: {
                    driverId: 'chatcore-gateway',
                    externalId: testParams.meta.requestId,
                    entryPoint: 'api/messages'
                },
                claimedOccurredAt: new Date(testParams.meta.clientTimestamp)
            },
            certifiedBy: {
                adapterId: 'fluxcore/whatsapp-gateway',
                adapterVersion: '1.0.0',
                signature: ''
            }
        };
        
        // 4. Firmar con la función patcheada
        console.log('\n📋 4. Firmando candidate...');
        candidate.certifiedBy.signature = patchedSignCandidate(candidate, 'development_signing_secret_wa');
        
        console.log('✅ Candidate firmado');
        
        // 5. Enviar al kernel patcheado
        console.log('\n📋 5. Enviando al kernel...');
        
        try {
            const signalId = patchedKernelIngest(candidate);
            console.log(`✅ Kernel validó exitosamente - Signal ID: ${signalId}`);
        } catch (error: any) {
            console.log(`❌ Kernel rechazó: ${error.message}`);
        }
        
        // 6. Analizar resultados
        console.log('\n📋 6. Analizando resultados...');
        analyzeRuntimeVsKernel();
        
    } catch (error: any) {
        console.error('❌ Error en prueba:', error.message);
    }
}

// Ejecutar prueba
testRuntimePatch();
