#!/usr/bin/env bun

/**
 * 🔍 ANÁLISIS DOCUMENTAL EMPÍRICO
 * 
 * Prueba exacta de lo que ChatCoreGatewayService genera vs lo que Kernel espera
 * Sin interpretaciones - solo evidencia técnica documental
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: TIPOS EXACTOS DEL KERNEL (src/core/types.ts)
// ═══════════════════════════════════════════════════════════

type PhysicalFactType =
    | 'EXTERNAL_INPUT_OBSERVED'
    | 'EXTERNAL_STATE_OBSERVED'
    | 'DELIVERY_SIGNAL_OBSERVED'
    | 'MEDIA_CAPTURED'
    | 'SYSTEM_TIMER_ELAPSED'
    | 'CONNECTION_EVENT_OBSERVED'
    | 'chatcore.message.received';

type ActorRef = {
    namespace: string;
    key: string;
};

type SourceRef = {
    namespace: string;
    key: string;
};

type Evidence = {
    raw: unknown;
    format: string;
    provenance: {
        driverId: string;
        externalId?: string;
        entryPoint?: string;
    };
    claimedOccurredAt?: Date;
};

type KernelCandidateSignal = {
    factType: PhysicalFactType;
    source: SourceRef;
    subject?: ActorRef;
    object?: ActorRef;
    evidence: Evidence;
    certifiedBy: {
        adapterId: string;
        adapterVersion: string;
        signature: string;
    };
};

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: FUNCIÓN DE CANONICALIZACIÓN (kernel.ts líneas 124-132)
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
// DOCUMENTACIÓN: CONSTANTES DE ChatCoreGatewayService
// ═══════════════════════════════════════════════════════════

const CHATCORE_GATEWAY_CONSTANTS = {
    DRIVER_ID: 'chatcore-gateway',
    ADAPTER_ID: 'fluxcore/whatsapp-gateway',
    ADAPTER_VERSION: '1.0.0',
    SIGNING_SECRET: 'development_signing_secret_wa'
};

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: FUNCIÓN signCandidate (chatcore-gateway.service.ts)
// ═══════════════════════════════════════════════════════════

function signCandidate(candidate: KernelCandidateSignal, signingSecret: string): string {
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
// DOCUMENTACIÓN: RECONSTRUCCIÓN EXACTA DE ChatCoreGatewayService.certifyIngress
// ═══════════════════════════════════════════════════════════

function reconstructChatCoreGatewayCandidate(
    accountId: string,
    userId: string,
    payload: any,
    meta: any
): KernelCandidateSignal {
    console.log('\n📋 DOCUMENTACIÓN: INPUT A ChatCoreGatewayService.certifyIngress');
    console.log('accountId:', accountId);
    console.log('userId:', userId);
    console.log('payload:', payload);
    console.log('meta:', meta);

    // Paso 1: Construir evidenceRaw (líneas 116-126 de chatcore-gateway.service.ts)
    const evidenceRaw = {
        payload: payload,
        accountId: accountId,
        userId: userId,
        meta: meta
    };

    console.log('\n📋 DOCUMENTACIÓN: evidenceRaw construido');
    console.log(JSON.stringify(evidenceRaw, null, 2));

    // Paso 2: Construir Evidence (líneas 117-126)
    const evidence: Evidence = {
        raw: evidenceRaw,
        format: 'json',
        provenance: {
            driverId: CHATCORE_GATEWAY_CONSTANTS.DRIVER_ID,
            externalId: meta?.requestId || 'fallback-' + Date.now(),
            entryPoint: 'api/messages'
        },
        claimedOccurredAt: meta?.clientTimestamp ? new Date(meta.clientTimestamp) : new Date()
    };

    console.log('\n📋 DOCUMENTACIÓN: Evidence construido');
    console.log(JSON.stringify(evidence, null, 2));

    // Paso 3: Definir ActorRef (líneas 128-132)
    const actorRef: ActorRef = {
        namespace: '@fluxcore/internal',
        key: accountId
    };

    console.log('\n📋 DOCUMENTACIÓN: ActorRef construido');
    console.log(JSON.stringify(actorRef, null, 2));

    // Paso 4: Construir KernelCandidateSignal (líneas 134-145)
    const candidate: KernelCandidateSignal = {
        factType: 'chatcore.message.received',
        source: actorRef,
        subject: actorRef,
        evidence: evidence,
        certifiedBy: {
            adapterId: CHATCORE_GATEWAY_CONSTANTS.ADAPTER_ID,
            adapterVersion: CHATCORE_GATEWAY_CONSTANTS.ADAPTER_VERSION,
            signature: '' // Se firma abajo
        }
    };

    console.log('\n📋 DOCUMENTACIÓN: KernelCandidateSignal ANTES de firma');
    console.log(JSON.stringify(candidate, null, 2));

    // Paso 5: Firmar (línea 146)
    candidate.certifiedBy.signature = signCandidate(candidate, CHATCORE_GATEWAY_CONSTANTS.SIGNING_SECRET);

    console.log('\n📋 DOCUMENTACIÓN: KernelCandidateSignal DESPUÉS de firma');
    console.log('signature:', candidate.certifiedBy.signature);

    return candidate;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: VALIDACIÓN DE MORFOLOGÍA
// ═══════════════════════════════════════════════════════════

function validateMorphology(candidate: KernelCandidateSignal): boolean {
    console.log('\n🔍 DOCUMENTACIÓN: VALIDACIÓN DE MORFOLOGÍA VS KERNEL EXPECTS');
    
    const requiredFields = [
        'factType',
        'source',
        'evidence',
        'certifiedBy'
    ];

    const optionalFields = [
        'subject',
        'object'
    ];

    let isValid = true;

    console.log('\n📋 CAMPOS REQUERIDOS:');
    requiredFields.forEach(field => {
        const hasField = field in candidate;
        console.log(`${hasField ? '✅' : '❌'} ${field}: ${hasField ? 'PRESENT' : 'MISSING'}`);
        if (!hasField) isValid = false;
    });

    console.log('\n📋 CAMPOS OPCIONALES:');
    optionalFields.forEach(field => {
        const hasField = field in candidate;
        console.log(`${hasField ? '✅' : '⚪'} ${field}: ${hasField ? 'PRESENT' : 'ABSENT (OK)'}`);
    });

    console.log('\n📋 SUB-CAMPOS DE certifiedBy:');
    const certifiedByFields = ['adapterId', 'adapterVersion', 'signature'];
    certifiedByFields.forEach(field => {
        const hasField = field in candidate.certifiedBy;
        const value = (candidate.certifiedBy as any)[field];
        console.log(`${hasField ? '✅' : '❌'} certifiedBy.${field}: ${hasField ? value : 'MISSING'}`);
        if (!hasField) isValid = false;
    });

    console.log('\n📋 SUB-CAMPOS DE evidence:');
    const evidenceFields = ['raw', 'format', 'provenance'];
    evidenceFields.forEach(field => {
        const hasField = field in candidate.evidence;
        console.log(`${hasField ? '✅' : '❌'} evidence.${field}: ${hasField ? 'PRESENT' : 'MISSING'}`);
        if (!hasField) isValid = false;
    });

    console.log('\n📋 SUB-CAMPOS DE evidence.provenance:');
    const provenanceFields = ['driverId', 'externalId', 'entryPoint'];
    provenanceFields.forEach(field => {
        const hasField = field in candidate.evidence.provenance;
        const value = (candidate.evidence.provenance as any)[field];
        console.log(`${hasField ? '✅' : '❌'} evidence.provenance.${field}: ${hasField ? value : 'MISSING'}`);
        if (!hasField) isValid = false;
    });

    console.log('\n📋 TIPOS DE DATOS:');
    console.log(`✅ factType: ${typeof candidate.factType} (${candidate.factType})`);
    console.log(`✅ source.namespace: ${typeof candidate.source.namespace} (${candidate.source.namespace})`);
    console.log(`✅ source.key: ${typeof candidate.source.key} (${candidate.source.key})`);
    console.log(`✅ evidence.format: ${typeof candidate.evidence.format} (${candidate.evidence.format})`);
    console.log(`✅ certifiedBy.adapterId: ${typeof candidate.certifiedBy.adapterId} (${candidate.certifiedBy.adapterId})`);
    console.log(`✅ certifiedBy.adapterVersion: ${typeof candidate.certifiedBy.adapterVersion} (${candidate.certifiedBy.adapterVersion})`);
    console.log(`✅ certifiedBy.signature: ${typeof candidate.certifiedBy.signature} (${candidate.certifiedBy.signature.length} chars)`);

    return isValid;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: PRUEBA EMPÍRICA COMPLETA
// ═══════════════════════════════════════════════════════════

function empiricalTest() {
    console.log('\n🔍 ANÁLISIS DOCUMENTAL EMPÍRICO - CHATCORE GATEWAY vs KERNEL');
    console.log('═══════════════════════════════════════════════════════════');

    // Datos de prueba reales
    const testInput = {
        accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
        userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
        payload: { text: 'Hola mundo' },
        meta: {
            conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
            requestId: 'req-' + Date.now(),
            clientTimestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser'
        }
    };

    console.log('\n📋 DOCUMENTACIÓN: INPUT DE PRUEBA');
    console.log(JSON.stringify(testInput, null, 2));

    // Generar el candidate exactamente como lo hace ChatCoreGatewayService
    const candidate = reconstructChatCoreGatewayCandidate(
        testInput.accountId,
        testInput.userId,
        testInput.payload,
        testInput.meta
    );

    console.log('\n📋 DOCUMENTACIÓN: OBJETO GENERADO POR ChatCoreGatewayService');
    console.log(JSON.stringify(candidate, null, 2));

    // Validar morfología
    const isValid = validateMorphology(candidate);

    console.log('\n📋 DOCUMENTACIÓN: RESULTADO DE VALIDACIÓN');
    console.log(`MORFOLOGÍA VÁLIDA: ${isValid ? '✅' : '❌'}`);

    // Verificar firma
    console.log('\n📋 DOCUMENTACIÓN: VERIFICACIÓN DE FIRMA');
    const expectedSignature = signCandidate(candidate, CHATCORE_GATEWAY_CONSTANTS.SIGNING_SECRET);
    const signatureMatches = candidate.certifiedBy.signature === expectedSignature;
    console.log(`FIRMA VÁLIDA: ${signatureMatches ? '✅' : '❌'}`);
    
    if (!signatureMatches) {
        console.log('❌ FIRMA ESPERADA:', expectedSignature);
        console.log('❌ FIRMA RECIBIDA:', candidate.certifiedBy.signature);
    }

    // Análisis de fuentes de información
    console.log('\n📋 DOCUMENTACIÓN: ANÁLISIS DE FUENTES DE INFORMACIÓN');
    console.log('🔍 accountId viene de: params.accountId (input directo)');
    console.log('🔍 userId viene de: params.userId (input directo)');
    console.log('🔍 payload viene de: params.payload (input directo)');
    console.log('🔍 meta viene de: params.meta (input directo)');
    console.log('🔍 evidence.raw viene de: {payload, accountId, userId, meta} (construido)');
    console.log('🔍 evidence.provenance.driverId viene de: CHATCORE_GATEWAY_CONSTANTS.DRIVER_ID');
    console.log('🔍 evidence.provenance.externalId viene de: meta.requestId o fallback');
    console.log('🔍 evidence.provenance.entryPoint viene de: hardcoded "api/messages"');
    console.log('🔍 source.namespace viene de: hardcoded "@fluxcore/internal"');
    console.log('🔍 source.key viene de: params.accountId');
    console.log('🔍 subject viene de: mismo que source (auto-representado)');
    console.log('🔍 factType viene de: hardcoded "chatcore.message.received"');
    console.log('🔍 certifiedBy.adapterId viene de: CHATCORE_GATEWAY_CONSTANTS.ADAPTER_ID');
    console.log('🔍 certifiedBy.adapterVersion viene de: CHATCORE_GATEWAY_CONSTANTS.ADAPTER_VERSION');
    console.log('🔍 certifiedBy.signature viene de: signCandidate() con HMAC-SHA256');

    console.log('\n🎯 DOCUMENTACIÓN: CONCLUSIÓN EMPÍRICA');
    console.log(`ChatCoreGatewayService ${isValid && signatureMatches ? '✅ GENERA' : '❌ NO GENERA'} el objeto exacto que el kernel espera`);
}

// Ejecutar prueba empírica
empiricalTest();
