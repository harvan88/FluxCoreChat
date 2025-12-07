/**
 * COR-006: Validación de Límites de Contexto
 * 
 * Constantes y funciones de validación para límites de contexto
 * según TOTEM.
 */

// Límites definidos en TOTEM
export const CONTEXT_LIMITS = {
  // Contexto privado de cuenta (TOTEM 5.2)
  PRIVATE_CONTEXT_MAX_CHARS: 5000,
  
  // Contexto de relación total (TOTEM 6.3)
  RELATIONSHIP_CONTEXT_MAX_CHARS: 2000,
  
  // Caracteres por entrada de contexto individual
  CONTEXT_ENTRY_MAX_CHARS: 500,
  
  // Alias de cuenta
  ALIAS_MAX_CHARS: 100,
  
  // Display name
  DISPLAY_NAME_MAX_CHARS: 255,
  
  // Username
  USERNAME_MAX_CHARS: 100,
} as const;

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  currentLength?: number;
  maxLength?: number;
}

/**
 * Valida longitud de private_context
 */
export function validatePrivateContext(context: string | null | undefined): ValidationResult {
  if (!context) return { valid: true };
  
  const length = context.length;
  const max = CONTEXT_LIMITS.PRIVATE_CONTEXT_MAX_CHARS;
  
  if (length > max) {
    return {
      valid: false,
      error: `Private context exceeds ${max} characters (current: ${length})`,
      currentLength: length,
      maxLength: max,
    };
  }
  
  return { valid: true, currentLength: length, maxLength: max };
}

/**
 * Valida longitud de contexto de relación
 */
export function validateRelationshipContext(
  currentTotalChars: number,
  newEntryLength: number
): ValidationResult {
  const newTotal = currentTotalChars + newEntryLength;
  const max = CONTEXT_LIMITS.RELATIONSHIP_CONTEXT_MAX_CHARS;
  
  if (newTotal > max) {
    return {
      valid: false,
      error: `Relationship context limit exceeded: ${newTotal}/${max} characters`,
      currentLength: newTotal,
      maxLength: max,
    };
  }
  
  return { valid: true, currentLength: newTotal, maxLength: max };
}

/**
 * Valida longitud de entrada de contexto individual
 */
export function validateContextEntry(content: string): ValidationResult {
  const length = content.length;
  const max = CONTEXT_LIMITS.CONTEXT_ENTRY_MAX_CHARS;
  
  if (length > max) {
    return {
      valid: false,
      error: `Context entry exceeds ${max} characters (current: ${length})`,
      currentLength: length,
      maxLength: max,
    };
  }
  
  return { valid: true, currentLength: length, maxLength: max };
}

/**
 * Valida alias
 */
export function validateAlias(alias: string | null | undefined): ValidationResult {
  if (!alias) return { valid: true };
  
  const length = alias.length;
  const max = CONTEXT_LIMITS.ALIAS_MAX_CHARS;
  
  if (length > max) {
    return {
      valid: false,
      error: `Alias exceeds ${max} characters (current: ${length})`,
      currentLength: length,
      maxLength: max,
    };
  }
  
  return { valid: true, currentLength: length, maxLength: max };
}

/**
 * Valida display name
 */
export function validateDisplayName(name: string): ValidationResult {
  const length = name.length;
  const max = CONTEXT_LIMITS.DISPLAY_NAME_MAX_CHARS;
  
  if (length > max) {
    return {
      valid: false,
      error: `Display name exceeds ${max} characters (current: ${length})`,
      currentLength: length,
      maxLength: max,
    };
  }
  
  if (length === 0) {
    return {
      valid: false,
      error: 'Display name is required',
      currentLength: 0,
      maxLength: max,
    };
  }
  
  return { valid: true, currentLength: length, maxLength: max };
}
