#!/usr/bin/env bun

/**
 * 🔍 PRUEBA SIMPLE DEL FLUJO REAL
 * 
 * Simula exactamente lo que hace el flujo real sin imports complejos
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
// DOCUMENTACIÓN: FUNCIÓN signCandidate (igual a ChatCoreGatewayService)
// ═══════════════════════════════════════════════════════════

function signCandidate(candidate: any, signingSecret: string): string {
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

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: SIMULACIÓN EXACTA DE ChatCoreGatewayService.certifyIngress
// ═══════════════════════════════════════════════════════════

function simulateChatCoreGatewayCertifyIngress(params: any): any {
    console.log('\n🔍 SIMULACIÓN: ChatCoreGatewayService.certifyIngress');
    console.log('📋 INPUT RECIBIDO:');
    console.log(JSON.stringify(params, null, 2));
    
    // Paso 1: Construir evidenceRaw (exactamente como en el servicio real)
    const evidenceRaw = {
        payload: params.payload,
        accountId: params.accountId,
        userId: params.userId,
        meta: params.meta
    };
    
    console.log('\n📋 evidenceRaw CONSTRUIDO:');
    console.log(JSON.stringify(evidenceRaw, null, 2));
    
    // Paso 2: Construir Evidence (exactamente como en el servicio real)
    const evidence = {
        raw: evidenceRaw,
        format: 'json',
        provenance: {
            driverId: 'chatcore-gateway',
            externalId: params.meta?.requestId || 'fallback-' + Date.now(),
            entryPoint: 'api/messages'
        },
        claimedOccurredAt: params.meta?.clientTimestamp ? new Date(params.meta.clientTimestamp) : new Date()
    };
    
    console.log('\n📋 Evidence CONSTRUIDO:');
    console.log(JSON.stringify(evidence, null, 2));
    
    // Paso 3: Definir ActorRef (exactamente como en el servicio real)
    const actorRef = {
        namespace: '@fluxcore/internal',
        key: params.accountId
    };
    
    // Paso 4: Construir KernelCandidateSignal (exactamente como en el servicio real)
    const candidate = {
        factType: 'chatcore.message.received',
        source: actorRef,
        subject: actorRef,
        evidence: evidence,
        certifiedBy: {
            adapterId: 'fluxcore/whatsapp-gateway',
            adapterVersion: '1.0.0',
            signature: '' // Se firma abajo
        }
    };
    
    console.log('\n📋 KernelCandidateSignal ANTES de firma:');
    console.log(JSON.stringify(candidate, null, 2));
    
    // Paso 5: Firmar (exactamente como en el servicio real)
    candidate.certifiedBy.signature = signCandidate(candidate, 'development_signing_secret_wa');
    
    console.log('\n📋 KernelCandidateSignal DESPUÉS de firma:');
    console.log('🔐 FIRMA:', candidate.certifiedBy.signature);
    console.log(JSON.stringify(candidate, null, 2));
    
    // Paso 6: Simular validación del kernel
    console.log('\n📋 ENVIANDO AL KERNEL...');
    
    try {
        const signalId = simulateKernelIngestSignal(candidate);
        console.log(`✅ KERNEL VALIDÓ - Signal ID: ${signalId}`);
        
        return {
            accepted: true,
            signalId: signalId,
            messagePersisted: true,
            certification: 'sync'
        };
    } catch (error: any) {
        console.log(`❌ KERNEL RECHAZÓ: ${error.message}`);
        
        return {
            accepted: false,
            reason: error.message,
            messagePersisted: false
        };
    }
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: SIMULACIÓN EXACTA DE Kernel.ingestSignal
// ═══════════════════════════════════════════════════════════

function simulateKernelIngestSignal(candidate: any): number {
    console.log('\n🔍 SIMULACIÓN: Kernel.ingestSignal');
    console.log('📋 CANDIDATE RECIBIDO:');
    console.log(JSON.stringify(candidate, null, 2));
    
    // Gate 1: Adapter registration (simulado - siempre válido en desarrollo)
    const adapterAllowed = {
        adapterId: candidate.certifiedBy.adapterId,
        signingSecret: 'development_signing_secret_wa',
        adapterVersion: candidate.certifiedBy.adapterVersion,
    };
    
    console.log('\n📋 GATE 1 - Adapter registration:');
    console.log(`✅ Adapter ${adapterAllowed.adapterId} está registrado`);
    
    // Gate 2: Adapter class (simulado - siempre GATEWAY)
    if (adapterAllowed.adapterId.includes('gateway')) {
        console.log('✅ Adapter class es GATEWAY (válido)');
    } else {
        throw new Error('Interpreter adapters cannot certify physical reality');
    }
    
    // Gate 3: Driver match
    if (adapterAllowed.driverId !== candidate.evidence.provenance.driverId) {
        throw new Error('Driver mismatch for adapter');
    }
    console.log('✅ Driver match válido');
    
    // Gate 4: HMAC signature verification
    console.log('\n📋 GATE 4 - HMAC signature verification:');
    
    const canonicalCandidate = canonicalize({
        factType: candidate.factType,
        source: candidate.source,
        subject: candidate.subject || null,
        object: candidate.object || null,
        evidence: candidate.evidence,
        adapterId: candidate.certifiedBy.adapterId,
        adapterVersion: candidate.certifiedBy.adapterVersion,
    });
    
    console.log('🔑 CANONICAL CANDIDATE:');
    console.log(canonicalCandidate);
    
    const expectedSignature = crypto
        .createHmac('sha256', adapterAllowed.signingSecret)
        .update(canonicalCandidate)
        .digest('hex');
    
    console.log('🔐 FIRMA ESPERADA:', expectedSignature);
    console.log('🔐 FIRMA RECIBIDA:', candidate.certifiedBy.signature);
    
    if (expectedSignature !== candidate.certifiedBy.signature) {
        throw new Error('Invalid reality adapter signature');
    }
    
    console.log('✅ FIRMA VÁLIDA');
    
    // Gate 5: Atomic transaction (simulado)
    console.log('✅ ATOMIC TRANSACTION completada');
    
    // Retornar signal ID simulado
    return Math.floor(Math.random() * 1000000);
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PRUEBA CON Y SIN CHANNEL
// ═══════════════════════════════════════════════════════════

async function testWithAndWithoutChannel() {
    console.log('\n🔍 PRUEBA COMPARATIVA: CON CHANNEL vs SIN CHANNEL');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Test 1: CON channel
    console.log('\n📋 TEST 1: CON meta.channel');
    
    const paramsWithChannel = {
        accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
        userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
        payload: { text: 'Mensaje CON channel' },
        meta: {
            conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
            requestId: 'with-channel-' + Date.now(),
            clientTimestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            userAgent: 'Test With Channel',
            channel: 'web' // 🔑 CON CHANNEL
        }
    };
    
    const resultWithChannel = simulateChatCoreGatewayCertifyIngress(paramsWithChannel);
    
    console.log('\n📋 RESULTADO CON CHANNEL:');
    console.log(JSON.stringify(resultWithChannel, null, 2));
    
    // Test 2: SIN channel
    console.log('\n📋 TEST 2: SIN meta.channel');
    
    const paramsWithoutChannel = {
        accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
        userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
        payload: { text: 'Mensaje SIN channel' },
        meta: {
            conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
            requestId: 'without-channel-' + Date.now(),
            clientTimestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            userAgent: 'Test Without Channel'
            // 🔑 SIN CHANNEL
        }
    };
    
    const resultWithoutChannel = simulateChatCoreGatewayCertifyIngress(paramsWithoutChannel);
    
    console.log('\n📋 RESULTADO SIN CHANNEL:');
    console.log(JSON.stringify(resultWithoutChannel, null, 2));
    
    // Comparación
    console.log('\n🔍 COMPARACIÓN FINAL:');
    console.log(`📋 CON CHANNEL:    ${resultWithChannel.accepted ? '✅ ACEPTADO' : '❌ RECHAZADO'}`);
    console.log(`📋 SIN CHANNEL:   ${resultWithoutChannel.accepted ? '✅ ACEPTADO' : '❌ RECHAZADO'}`);
    
    if (resultWithChannel.accepted && resultWithoutChannel.accepted) {
        console.log('\n✅ AMBOS CASOS FUNCIONAN - el channel NO es el problema');
    } else if (resultWithChannel.accepted && !resultWithoutChannel.accepted) {
        console.log('\n❌ SOLO FALLA SIN CHANNEL - el channel SÍ es el problema');
    } else if (!resultWithChannel.accepted && resultWithoutChannel.accepted) {
        console.log('\n❌ SOLO FALLA CON CHANNEL - problema extraño');
    } else {
        console.log('\n❌ AMBOS FALLAN - el problema es otro');
    }
}

// Ejecutar prueba
testWithAndWithoutChannel();
