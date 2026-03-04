#!/usr/bin/env bun

/**
 * 🔍 PRUEBA CON EL KERNEL REAL
 * 
 * Usa el kernel real para validar el driver fix
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// DOCUMENTACIÓN: IMPORTAR KERNEL REAL
// ═══════════════════════════════════════════════════════════

async function testRealKernel() {
    console.log('\n🔍 PRUEBA CON KERNEL REAL');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // Importar kernel real
        const { ingestSignal } = await import('./core/kernel.ts');
        
        console.log('✅ Kernel real importado');
        
        // Preparar candidate exacto como lo hace ChatCoreGateway
        const candidate = {
            factType: 'chatcore.message.received',
            source: {
                namespace: '@fluxcore/internal',
                key: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31'
            },
            subject: {
                namespace: '@fluxcore/internal',
                key: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31'
            },
            evidence: {
                raw: {
                    payload: { text: 'Mensaje real con kernel' },
                    accountId: '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31',
                    userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
                    meta: {
                        conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
                        requestId: 'real-kernel-' + Date.now(),
                        clientTimestamp: new Date().toISOString(),
                        ip: '127.0.0.1',
                        userAgent: 'Real Kernel Test',
                        channel: 'web'
                    }
                },
                format: 'json',
                provenance: {
                    driverId: 'chatcore-gateway',
                    externalId: 'real-kernel-' + Date.now(),
                    entryPoint: 'api/messages'
                },
                claimedOccurredAt: new Date()
            },
            certifiedBy: {
                adapterId: 'fluxcore/whatsapp-gateway',
                adapterVersion: '1.0.0',
                signature: '' // Se firma abajo
            }
        };
        
        console.log('\n📋 CANDIDATE CONSTRUIDO:');
        console.log(JSON.stringify(candidate, null, 2));
        
        // Firmar candidate
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
        
        const canonicalPayload = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject || null,
            object: candidate.object || null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });
        
        candidate.certifiedBy.signature = crypto
            .createHmac('sha256', 'development_signing_secret_wa')
            .update(canonicalPayload)
            .digest('hex');
        
        console.log('\n🔐 CANDIDATE FIRMADO:');
        console.log('Firma:', candidate.certifiedBy.signature);
        
        // Enviar al kernel real
        console.log('\n📋 ENVIANDO AL KERNEL REAL...');
        
        try {
            const signalId = await ingestSignal(candidate);
            console.log(`✅ KERNEL REAL VALIDÓ - Signal ID: ${signalId}`);
            
            return {
                success: true,
                signalId: signalId,
                message: 'Kernel real validó correctamente'
            };
        } catch (error: any) {
            console.log(`❌ KERNEL REAL RECHAZÓ: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                message: 'Kernel real rechazó el candidate'
            };
        }
        
    } catch (error: any) {
        console.error('❌ Error en prueba:', error.message);
        
        return {
            success: false,
            error: error.message,
            message: 'Error al importar kernel o ejecutar prueba'
        };
    }
}

// Ejecutar prueba
testRealKernel().then(result => {
    console.log('\n🎯 RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));
});
