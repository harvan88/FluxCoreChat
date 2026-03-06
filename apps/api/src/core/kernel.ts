import crypto from 'node:crypto';
import { db, fluxcoreSignals, fluxcoreOutbox, sql } from '@fluxcore/db';
import type { KernelCandidateSignal, PhysicalFactType } from './types';
import { coreEventBus } from './events';

/**
 * Normaliza un valor de fecha a un objeto Date válido.
 * Maneja strings ISO, numbers (timestamps), y objetos Date.
 */
function normalizeDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

/**
 * FluxCore Kernel — RFC-0001 (RATIFIED)
 *
 * SOVEREIGN REALITY CERTIFIER
 *
 * The Kernel does ONE thing: certify that FluxCore received
 * evidence from the external world through an authorized Reality Adapter.
 *
 * It does NOT:
 *   - Know what a user, account, conversation, or message is
 *   - Interpret payloads
 *   - Emit business events
 *   - Allow direct invocation from services, IA, or controllers
 *
 * ONLY registered Reality Adapters (SENSOR/GATEWAY) may invoke ingestSignal().
 */

const PHYSICAL_FACT_TYPES: ReadonlySet<PhysicalFactType> = new Set([
    'EXTERNAL_INPUT_OBSERVED',
    'EXTERNAL_STATE_OBSERVED',
    'DELIVERY_SIGNAL_OBSERVED',
    'MEDIA_CAPTURED',
    'SYSTEM_TIMER_ELAPSED',
    'CONNECTION_EVENT_OBSERVED',
    'chatcore.message.received',
    'AI_RESPONSE_GENERATED',
]);

// ─────────────────────────────────────────────
// Deterministic Canonicalization & Fingerprinting
// ─────────────────────────────────────────────

function canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return '[' + value.map(canonicalize).join(',') + ']';
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return '{' + entries
        .map(([key, val]) => JSON.stringify(key) + ':' + canonicalize(val))
        .join(',') + '}';
}

function checksumEvidence(raw: unknown): string {
    const serialized = canonicalize(raw ?? null);
    return crypto.createHash('sha256').update(serialized).digest('hex');
}

function fingerprint(candidate: KernelCandidateSignal, checksum: string): string {
    const base = [
        candidate.certifiedBy.adapterId,
        candidate.source.namespace,
        candidate.source.key,
        candidate.evidence.provenance.externalId ?? '',
        checksum,
    ].join('|');

    return crypto.createHash('sha256').update(base).digest('hex');
}

// ─────────────────────────────────────────────
// Kernel
// ─────────────────────────────────────────────

export class Kernel {
    /**
     * Ingests a certified observation into the Journal.
     *
     * This is the ONLY entry point for facts into
     * system sovereign state.
     *
     * CALLER RESTRICTION:
     *   Only registered Reality Adapters (class SENSOR or GATEWAY)
     *   may invoke this method. INTERPRETER adapters, services,
     *   IA agents, and controllers are PROHIBITED.
     */
    async ingestSignal(candidate: KernelCandidateSignal): Promise<number> {
        console.log(`[Kernel] 🔍 INGEST_SIGNAL START ==================`);
        console.log(`[Kernel] 📥 CANDIDATE RECEIVED:`);
        console.log(`  - factType: ${candidate.factType}`);
        console.log(`  - source: ${JSON.stringify(candidate.source)}`);
        console.log(`  - subject: ${JSON.stringify(candidate.subject)}`);
        console.log(`  - object: ${candidate.object ? JSON.stringify(candidate.object) : 'undefined'}`);
        console.log(`  - evidence.format: ${candidate.evidence.format}`);
        console.log(`  - evidence.provenance.driverId: ${candidate.evidence.provenance.driverId}`);
        console.log(`  - evidence.provenance.externalId: ${candidate.evidence.provenance.externalId}`);
        console.log(`  - evidence.provenance.entryPoint: ${candidate.evidence.provenance.entryPoint}`);
        console.log(`  - evidence.raw (preview): ${JSON.stringify(candidate.evidence.raw).substring(0, 200)}...`);
        console.log(`  - certifiedBy.adapterId: ${candidate.certifiedBy.adapterId}`);
        console.log(`  - certifiedBy.adapterVersion: ${candidate.certifiedBy.adapterVersion}`);
        console.log(`  - certifiedBy.signature (preview): ${candidate.certifiedBy.signature.substring(0, 16)}...`);
        console.log(`[Kernel] 🔍 INGEST_SIGNAL END ==================`);
        // ── Gate 1: Physical fact type ──
        if (!PHYSICAL_FACT_TYPES.has(candidate.factType)) {
            throw new Error(`Unknown physical fact class: ${candidate.factType}`);
        }

        // ── Gate 2: Adapter registration ──
        const adapterAllowed = await db.query.fluxcoreRealityAdapters.findFirst({
            where: (t, { eq }) => eq(t.adapterId, candidate.certifiedBy.adapterId),
            columns: {
                adapterId: true,
                driverId: true,
                adapterClass: true,
                signingSecret: true,
                adapterVersion: true,
            },
        });

        if (!adapterAllowed) {
            throw new Error(`Unknown reality adapter: ${candidate.certifiedBy.adapterId}`);
        }

        // ── Gate 3: Adapter class ──
        if (adapterAllowed.adapterClass === 'INTERPRETER') {
            throw new Error(
                `Interpreter adapters cannot certify physical reality (${candidate.certifiedBy.adapterId})`
            );
        }

        // ── Gate 4: Driver match ──
        if (adapterAllowed.driverId !== candidate.evidence.provenance.driverId) {
            throw new Error(
                `Driver mismatch for adapter ${candidate.certifiedBy.adapterId}`
            );
        }

        // ── Gate 5: HMAC signature verification ──
        console.log(`[Kernel] 🔍 CANONICALIZANDO:`);
        console.log(`📋 Fact: ${candidate.factType}`);
        console.log(`📋 Source: ${JSON.stringify(candidate.source)}`);
        console.log(`📋 Object: ${candidate.object ? 'present' : 'none'}`);
        console.log(`📋 Evidence Keys: ${Object.keys(candidate.evidence)}`);
        console.log(`📋 Evidence Raw Keys: ${Object.keys(candidate.evidence.raw)}`);
        console.log(`📋 Evidence Meta Keys: ${Object.keys((candidate.evidence.raw as any).meta || {})}`);
        console.log(`📋 Adapter: ${candidate.certifiedBy.adapterId} v${candidate.certifiedBy.adapterVersion}`);

        const canonicalCandidate = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject ?? null,
            object: candidate.object ?? null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });

        console.log(`[Kernel] 📋 CANONICAL GENERADO:`);
        console.log(`📋 Length: ${canonicalCandidate.length} chars`);
        console.log(`📋 Preview: ${canonicalCandidate.substring(0, 100)}...`);

        console.log(`[Kernel] 🔍 VERIFICANDO FIRMA:`);
        console.log(`📋 Adapter: ${candidate.certifiedBy.adapterId}`);
        console.log(`📋 Secret: ${adapterAllowed.signingSecret ? 'configured' : 'missing'}`);
        console.log(`📋 Received: ${candidate.certifiedBy.signature.substring(0, 16)}...`);
        const expectedSignature = crypto.createHmac('sha256', adapterAllowed.signingSecret!)
            .update(canonicalCandidate)
            .digest('hex');

        console.log(`📋 Expected: ${expectedSignature.substring(0, 16)}...`);
        console.log(`📋 Match: ${expectedSignature === candidate.certifiedBy.signature ? '✅' : '❌'}`);

        if (expectedSignature !== candidate.certifiedBy.signature) {
            console.error(`[Kernel] ❌ SIGNATURE VERIFICATION FAILED:`);
            console.error(`📋 Expected: ${expectedSignature}`);
            console.error(`📋 Received: ${candidate.certifiedBy.signature}`);
            console.error(`📋 Adapter: ${candidate.certifiedBy.adapterId}`);
            console.error(`📋 Canonical: ${canonicalCandidate}`);

            // 🔍 DIAGNÓSTICO DETALLADO
            console.error(`[Kernel] 🔍 DIAGNÓSTICO DETALLADO:`);

            // Comparar longitud
            if (expectedSignature.length !== candidate.certifiedBy.signature.length) {
                console.error(`📋 ❌ Longitud diferente: expected=${expectedSignature.length}, received=${candidate.certifiedBy.signature.length}`);
            }

            // Comparar primeros/últimos caracteres
            const prefixLength = 8;
            if (expectedSignature.substring(0, prefixLength) !== candidate.certifiedBy.signature.substring(0, prefixLength)) {
                console.error(`📋 ❌ Prefijo diferente: expected="${expectedSignature.substring(0, prefixLength)}", received="${candidate.certifiedBy.signature.substring(0, prefixLength)}"`);
            }

            if (expectedSignature.substring(-prefixLength) !== candidate.certifiedBy.signature.substring(-prefixLength)) {
                console.error(`📋 ❌ Sufijo diferente: expected="${expectedSignature.substring(-prefixLength)}", received="${candidate.certifiedBy.signature.substring(-prefixLength)}"`);
            }

            // Analizar diferencias carácter por carácter
            let differences = [];
            const minLength = Math.min(expectedSignature.length, candidate.certifiedBy.signature.length);
            for (let i = 0; i < minLength; i++) {
                if (expectedSignature[i] !== candidate.certifiedBy.signature[i]) {
                    differences.push(`pos${i}: expected="${expectedSignature[i]}", received="${candidate.certifiedBy.signature[i]}"`);
                    if (differences.length >= 5) break; // Limitar output
                }
            }
            if (differences.length > 0) {
                console.error(`📋 ❌ Diferencias encontradas: ${differences.join(', ')}`);
            }

            // Posibles causas
            console.error(`[Kernel] 🔍 POSIBLES CAUSAS:`);
            console.error(`📋 1. Timestamp diferente en claimedOccurredAt`);
            console.error(`📋 2. Orden diferente de propiedades en canonical`);
            console.error(`📋 3. Propiedades faltantes o extrañas`);
            console.error(`📋 4. Diferencia en signing secret`);
            console.error(`📋 5. Diferencia en canonicalize function`);

            throw new Error('Invalid reality adapter signature');
        }

        console.log(`[Kernel] ✅ SIGNATURE VERIFIED SUCCESSFULLY`);

        // ── Atomic Transaction: Journal + Outbox ──
        return db.transaction(async (tx) => {
            const checksum = checksumEvidence(candidate.evidence.raw);
            const signalFingerprint = fingerprint(candidate, checksum);

            // Idempotency: check by (adapter, external_id) first
            if (candidate.evidence.provenance.externalId) {
                const existingByExternal = await tx.query.fluxcoreSignals.findFirst({
                    where: (t, { and, eq }) => and(
                        eq(t.certifiedByAdapter, candidate.certifiedBy.adapterId),
                        eq(t.provenanceExternalId, candidate.evidence.provenance.externalId!)
                    ),
                    columns: { sequenceNumber: true },
                });

                if (existingByExternal) {
                    return existingByExternal.sequenceNumber;
                }
            }

            // Insert into Journal using raw SQL to avoid timestamp conversion issues
            const occurredAt = candidate.evidence.claimedOccurredAt 
                ? new Date(candidate.evidence.claimedOccurredAt).toISOString()
                : new Date().toISOString();
            
            const insertResult = await tx.execute(sql`
                INSERT INTO fluxcore_signals (
                    fact_type, 
                    source_namespace, source_key,
                    subject_namespace, subject_key,
                    object_namespace, object_key,
                    evidence_raw, evidence_format, evidence_checksum,
                    provenance_driver_id, provenance_external_id, provenance_entry_point,
                    certified_by_adapter, certified_adapter_version,
                    claimed_occurred_at, signal_fingerprint
                ) VALUES (
                    ${candidate.factType},
                    ${candidate.source.namespace}, ${candidate.source.key},
                    ${candidate.subject?.namespace ?? null}, ${candidate.subject?.key ?? null},
                    ${candidate.object?.namespace ?? null}, ${candidate.object?.key ?? null},
                    ${candidate.evidence.raw}, ${candidate.evidence.format}, ${checksum},
                    ${candidate.evidence.provenance.driverId}, ${candidate.evidence.provenance.externalId ?? null}, ${candidate.evidence.provenance.entryPoint ?? null},
                    ${candidate.certifiedBy.adapterId}, ${adapterAllowed.adapterVersion},
                    ${occurredAt}::timestamp, ${signalFingerprint}
                )
                ON CONFLICT (signal_fingerprint) DO NOTHING
                RETURNING sequence_number
            `);
            
            const sequenceNumber = insertResult[0]?.sequence_number;
            
            if (sequenceNumber) {
                console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_stored seq=${sequenceNumber}`);
                
                // Transactional Outbox — same transaction, guaranteed
                await tx.execute(sql`
                    INSERT INTO fluxcore_outbox (signal_id, event_type, payload, status)
                    VALUES (
                        ${sequenceNumber}, 
                        'kernel:signal_ingested',
                        ${JSON.stringify({
                            sequenceNumber,
                            factType: candidate.factType,
                            adapterId: candidate.certifiedBy.adapterId
                        })},
                        'pending'
                    )
                    ON CONFLICT DO NOTHING
                `);

                return sequenceNumber;
            }

            // Fingerprint collision → return existing sequence
            const existing = await tx.query.fluxcoreSignals.findFirst({
                where: (t, { eq }) => eq(t.signalFingerprint, signalFingerprint),
                columns: { sequenceNumber: true },
            });

            if (!existing) {
                throw new Error(
                    'Kernel invariant violation: fingerprint conflict but record not found'
                );
            }

            console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_duplicate seq=${existing.sequenceNumber}`);
            return existing.sequenceNumber;
        });
        
        // Emit wakeup event AFTER transaction commits successfully
        coreEventBus.emit('kernel:wakeup', { 
            source: 'kernel.ingestSignal',
            timestamp: Date.now() 
        });
    }
}

export const kernel = new Kernel();
