/**
 * Generate a UUID v4 compatible string.
 * Uses crypto.randomUUID() if available (secure contexts/HTTPS).
 * Falls back to a Math.random() based generator if not (local development/HTTP).
 */
export function generateUUID(): string {
    // Check if crypto.randomUUID is available
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback for non-secure contexts (HTTP)
    // Based on the RFC4122 v4 UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
