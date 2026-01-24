/**
 * FluxCore Formatters
 * 
 * Funciones de formateo compartidas entre todos los módulos.
 * Estas funciones estaban duplicadas en AssistantsView, InstructionsView,
 * VectorStoresView. Ahora están centralizadas.
 */

// ============================================================================
// Size Formatting
// ============================================================================

/**
 * Formatea bytes a una representación legible (B, KB, MB, GB)
 * 
 * @example
 * formatSize(1024) // "1 KB"
 * formatSize(1536000) // "1.5 MB"
 */
export function formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Formatea bytes a KB con precisión para archivos pequeños
 */
export function formatSizeKB(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 KB';
    return `${(bytes / 1024).toFixed(1)} KB`;
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Formatea una fecha ISO a formato corto (ej: "24 ene")
 * 
 * @example
 * formatDate("2026-01-24T10:00:00Z") // "24 ene"
 */
export function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    } catch {
        return '-';
    }
}

/**
 * Formatea una fecha ISO a formato largo con hora
 * 
 * @example
 * formatDateTime("2026-01-24T10:30:00Z") // "24 ene 2026, 10:30"
 */
export function formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 * 
 * @example
 * formatRelativeDate("2026-01-24T09:00:00Z") // "hace 2 horas"
 */
export function formatRelativeDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'ahora';
        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours} h`;
        if (diffDays < 7) return `hace ${diffDays} d`;
        return formatDate(dateStr);
    } catch {
        return '-';
    }
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estima tokens basándose en palabras (aproximación: 1 palabra ≈ 1.3 tokens)
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.ceil(words * 1.3);
}

/**
 * Cuenta palabras en un texto
 */
export function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Cuenta líneas en un texto
 */
export function countLines(text: string): number {
    if (!text) return 0;
    return text.split('\n').length;
}

// ============================================================================
// Currency & Cost Formatting
// ============================================================================

/**
 * Formatea un costo en USD
 * 
 * @example
 * formatCost(0.00123) // "$0.00123"
 */
export function formatCost(amount: number, decimals = 5): string {
    return `$${amount.toFixed(decimals)}`;
}

/**
 * Calcula costo estimado de OpenAI Vector Store por día
 * Basado en $0.10 USD / GB / día
 */
export function calculateVectorStoreCostPerDay(sizeBytes: number): number {
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    return sizeGB * 0.10;
}

// ============================================================================
// Truncation
// ============================================================================

/**
 * Trunca un texto a una longitud máxima con ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Trunca un ID para mostrar más legible
 * 
 * @example
 * truncateId("asst_abc123xyz789") // "asst_abc...789"
 */
export function truncateId(id: string, visibleChars = 6): string {
    if (!id || id.length <= visibleChars * 2 + 3) return id;
    return `${id.slice(0, visibleChars)}...${id.slice(-visibleChars)}`;
}
