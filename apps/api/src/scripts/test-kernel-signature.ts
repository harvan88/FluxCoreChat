import { kernel } from '../core/kernel';
import { signCandidate } from '../services/fluxcore/kernel-utils';
import { db } from '@fluxcore/db';
import type { KernelCandidateSignal } from '../core/types';

/**
 * Test de Soberanía: Verificación de Firmas del Kernel
 * 
 * Este script prueba que un Reality Adapter puede emitir una señal
 * y que el Kernel la acepta verificando la firma HMAC.
 * NO requiere LLM.
 */

async function runTest() {
    console.log('🧪 INICIANDO TEST DE FIRMA DEL KERNEL...');

    // 1. Obtener un adapter válido de la DB para usar su secret
    const adapterId = 'fluxcore-cognition-gateway';
    const adapter = await db.query.fluxcoreRealityAdapters.findFirst({
        where: (t, { eq }) => eq(t.adapterId, adapterId)
    });

    if (!adapter) {
        console.error(`❌ Error: No se encontró el adapter ${adapterId} en la DB.`);
        process.exit(1);
    }

    console.log(`✅ Adapter encontrado: ${adapterId} (Driver: ${adapter.driverId})`);

    // 2. Crear una señal de prueba con datos que suelen dar problemas (undefined/null)
    const candidate: KernelCandidateSignal = {
        factType: 'COGNITIVE_STEP_OBSERVED',
        source: { namespace: '@fluxcore/test', key: 'test-script' },
        subject: { namespace: '@fluxcore/test', key: 'test-subject' },
        object: null, // Test case: explicit null
        evidence: {
            raw: {
                message: 'Hola Test',
                metadata: {
                    browser: 'Chrome',
                    version: undefined, // Test case: explicit undefined (MUST BE SKIPPED)
                    tags: ['test', 'signature']
                }
            },
            format: 'json',
            provenance: {
                driverId: adapter.driverId,
                externalId: `test-sig-${Date.now()}`,
                entryPoint: 'test-script'
            },
            claimedOccurredAt: new Date().toISOString()
        },
        certifiedBy: {
            adapterId: adapter.adapterId,
            adapterVersion: adapter.adapterVersion || '1.0.0',
            signature: ''
        }
    };

    // 3. Firmar la señal usando la utilidad oficial (que usa el canonicalize unificado)
    console.log('✍️ Firmando señal...');
    candidate.certifiedBy.signature = signCandidate(candidate, adapter.signingSecret!);
    console.log(`📋 Firma generada: ${candidate.certifiedBy.signature.substring(0, 16)}...`);

    // 4. Ingestar en el Kernel
    console.log('➡️ Enviando al Kernel para certificación...');
    try {
        const sequenceNumber = await kernel.ingestSignal(candidate);
        console.log(`\n✅ TEST EXITOSO!`);
        console.log(`🚀 Señal certificada por el Kernel. Sequence Number: ${sequenceNumber}`);
    } catch (error: any) {
        console.error(`\n❌ TEST FALLIDO!`);
        console.error(`🔴 El Kernel rechazó la señal: ${error.message}`);
        process.exit(1);
    }
}

runTest().catch(console.error);
