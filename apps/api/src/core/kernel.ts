import crypto from 'node:crypto';
import { db, fluxcoreSignals, fluxcoreOutbox } from '@fluxcore/db';
import type { KernelCandidateSignal, PhysicalFactType } from './types';

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
        console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_start fact=${candidate.factType}`);
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
        const canonicalCandidate = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject ?? null,
            object: candidate.object ?? null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });

        const expectedSignature = crypto
            .createHmac('sha256', adapterAllowed.signingSecret)
            .update(canonicalCandidate)
            .digest('hex');

        if (expectedSignature !== candidate.certifiedBy.signature) {
            throw new Error('Invalid reality adapter signature');
        }

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

            // Insert into Journal
            const inserted = await tx.insert(fluxcoreSignals)
                .values({
                    signalFingerprint,
                    factType: candidate.factType,

                    sourceNamespace: candidate.source.namespace,
                    sourceKey: candidate.source.key,

                    subjectNamespace: candidate.subject?.namespace ?? null,
                    subjectKey: candidate.subject?.key ?? null,

                    objectNamespace: candidate.object?.namespace ?? null,
                    objectKey: candidate.object?.key ?? null,

                    evidenceRaw: candidate.evidence.raw,
                    evidenceFormat: candidate.evidence.format,
                    evidenceChecksum: checksum,

                    provenanceDriverId: candidate.evidence.provenance.driverId,
                    provenanceExternalId: candidate.evidence.provenance.externalId ?? null,
                    provenanceEntryPoint: candidate.evidence.provenance.entryPoint ?? null,

                    certifiedByAdapter: candidate.certifiedBy.adapterId,
                    certifiedAdapterVersion: adapterAllowed.adapterVersion,

                    claimedOccurredAt: candidate.evidence.claimedOccurredAt ?? null,
                })
                .onConflictDoNothing()
                .returning({ sequenceNumber: fluxcoreSignals.sequenceNumber });

            if (inserted.length > 0) {
                console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_stored seq=${inserted[0].sequenceNumber}`);
                // Transactional Outbox — same transaction, guaranteed
                await tx.insert(fluxcoreOutbox)
                    .values({ sequenceNumber: inserted[0].sequenceNumber })
                    .onConflictDoNothing();

                return inserted[0].sequenceNumber;
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
    }
}

export const kernel = new Kernel();
