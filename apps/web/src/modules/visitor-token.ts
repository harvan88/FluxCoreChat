const STORAGE_KEY = 'fluxcore_visitor_token';
const VISITOR_ACTOR_KEY = 'fluxcore_visitor_actor_id';

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
 * Stores the visitor actor ID in localStorage for widget sessions
 */
export function setVisitorActorId(actorId: string): void {
    localStorage.setItem(VISITOR_ACTOR_KEY, actorId);
}

/**
 * Gets the stored visitor actor ID
 */
export function getVisitorActorId(): string | null {
    return localStorage.getItem(VISITOR_ACTOR_KEY);
}

/**
 * Clears the visitor_token and visitor actor ID from localStorage.
 * Should be called only after the visitor has fully authenticated
 * and the identity link has been persisted server-side.
 */
export function clearVisitorToken(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VISITOR_ACTOR_KEY);
}

/**
 * Returns the stored visitor_token without creating a new one.
 * Returns null if no token exists.
 */
export function getVisitorToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}
