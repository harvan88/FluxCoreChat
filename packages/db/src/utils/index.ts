/**
 * Utility functions for database operations
 */

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp
 */
export function now(): Date {
  return new Date();
}

/**
 * Validate context character limit
 */
export function validateContextLimit(content: string, limit: number): boolean {
  return content.length <= limit;
}

/**
 * Calculate total characters in context entries
 */
export function calculateContextChars(entries: Array<{ content: string }>): number {
  return entries.reduce((total, entry) => total + entry.content.length, 0);
}
