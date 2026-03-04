import crypto from 'node:crypto';

/**
 * Utilidades compartidas del Kernel
 * Evita duplicación de canonicalize entre adapters
 */

/**
 * Canonical JSON serialization - IMPLEMENTACIÓN OFICIAL DEL KERNEL
 * Usada por Kernel y todos los Reality Adapters
 */
export function canonicalize(value: unknown): string {
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

// 🔍 DEBUG: Verificar resultado final
export function debugCanonicalize(value: unknown): string {
    const result = canonicalize(value);
    console.log(`[debugCanonicalize] 🔍 RESULTADO FINAL:`);
    console.log(`📋 Input: ${JSON.stringify(value, null, 2)}`);
    console.log(`📋 Output: ${result}`);
    return result;
}

/**
 * Checksum de evidencia usando canonicalización
 */
export function checksumEvidence(raw: unknown): string {
    const serialized = canonicalize(raw ?? null);
    return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Firma un candidato usando canonicalización oficial
 */
export function signCandidate(candidate: any, signingSecret: string): string {
    const canonical = canonicalize({
        factType: candidate.factType,
        source: candidate.source,
        subject: candidate.subject ?? null,
        object: candidate.object ?? null,
        evidence: candidate.evidence,
        adapterId: candidate.certifiedBy.adapterId,
        adapterVersion: candidate.certifiedBy.adapterVersion,
    });

    console.log(`[signCandidate] 🔍 CANDIDATE PARA FIRMAR:`);
    console.log(`📋 Input: ${JSON.stringify(candidate, null, 2)}`);
    console.log(`📋 Canonical: ${canonical}`);

    const signature = crypto
        .createHmac('sha256', signingSecret)
        .update(canonical)
        .digest('hex');

    console.log(`[signCandidate] ✅ FIRMA GENERADA: ${signature}`);
    return signature;
}
