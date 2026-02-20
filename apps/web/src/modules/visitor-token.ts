const STORAGE_KEY = 'fluxcore_visitor_token';

/**
 * Returns the visitor_token for this browser session.
 * Creates and persists a new UUID if none exists yet.
 *
 * The visitor_token is the provisional identity of an anonymous
 * widget visitor. It survives page reloads via localStorage.
 */
export function getOrCreateVisitorToken(): string {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
}

/**
 * Clears the visitor_token from localStorage.
 * Should be called only after the visitor has fully authenticated
 * and the identity link has been persisted server-side.
 */
export function clearVisitorToken(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns the stored visitor_token without creating a new one.
 * Returns null if no token exists.
 */
export function getVisitorToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}
