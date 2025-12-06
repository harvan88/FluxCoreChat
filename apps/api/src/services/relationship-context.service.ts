/**
 * RelationshipContext Service
 * 
 * Gestiona el contexto unificado de las relaciones con:
 * - Entradas con autoría (note, preference, rule)
 * - Límite de 2000 caracteres total
 * - CRUD de entradas de contexto
 */

import { db } from '@fluxcore/db';
import { relationships } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import type { ContextEntry, RelationshipContext, RelationshipPerspective } from '@fluxcore/db';

const MAX_CONTEXT_CHARS = 2000;

export interface AddContextEntryInput {
  relationshipId: string;
  authorAccountId: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
}

export interface UpdateContextEntryInput {
  relationshipId: string;
  entryIndex: number;
  content?: string;
  type?: 'note' | 'preference' | 'rule';
}

export interface UpdatePerspectiveInput {
  relationshipId: string;
  accountId: string;
  savedName?: string | null;
  tags?: string[];
  status?: 'active' | 'blocked' | 'archived';
}

class RelationshipContextService {
  /**
   * Obtener el contexto de una relación
   */
  async getContext(relationshipId: string): Promise<RelationshipContext | null> {
    const [rel] = await db
      .select({ context: relationships.context })
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) return null;
    
    return (rel.context as RelationshipContext) || { entries: [], total_chars: 0 };
  }

  /**
   * Agregar una entrada de contexto
   */
  async addEntry(input: AddContextEntryInput): Promise<{ success: boolean; context?: RelationshipContext; error?: string }> {
    const { relationshipId, authorAccountId, content, type } = input;

    // Obtener relación actual
    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) {
      return { success: false, error: 'Relationship not found' };
    }

    const currentContext = (rel.context as RelationshipContext) || { entries: [], total_chars: 0 };
    
    // Calcular nuevo total de caracteres
    const newTotalChars = currentContext.total_chars + content.length;
    
    if (newTotalChars > MAX_CONTEXT_CHARS) {
      return { 
        success: false, 
        error: `Context limit exceeded. Max: ${MAX_CONTEXT_CHARS}, Current: ${currentContext.total_chars}, New entry: ${content.length}` 
      };
    }

    // Crear nueva entrada
    const newEntry: ContextEntry = {
      author_account_id: authorAccountId,
      content,
      type,
      created_at: new Date().toISOString(),
    };

    // Actualizar contexto
    const updatedContext: RelationshipContext = {
      entries: [...currentContext.entries, newEntry],
      total_chars: newTotalChars,
    };

    await db
      .update(relationships)
      .set({ context: updatedContext })
      .where(eq(relationships.id, relationshipId));

    return { success: true, context: updatedContext };
  }

  /**
   * Actualizar una entrada de contexto
   */
  async updateEntry(input: UpdateContextEntryInput): Promise<{ success: boolean; context?: RelationshipContext; error?: string }> {
    const { relationshipId, entryIndex, content, type } = input;

    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) {
      return { success: false, error: 'Relationship not found' };
    }

    const currentContext = (rel.context as RelationshipContext) || { entries: [], total_chars: 0 };

    if (entryIndex < 0 || entryIndex >= currentContext.entries.length) {
      return { success: false, error: 'Entry not found' };
    }

    const entry = currentContext.entries[entryIndex];
    const oldLength = entry.content.length;
    const newContent = content !== undefined ? content : entry.content;
    const newLength = newContent.length;

    // Calcular nuevo total
    const newTotalChars = currentContext.total_chars - oldLength + newLength;

    if (newTotalChars > MAX_CONTEXT_CHARS) {
      return { 
        success: false, 
        error: `Context limit exceeded. Max: ${MAX_CONTEXT_CHARS}, Would be: ${newTotalChars}` 
      };
    }

    // Actualizar entrada
    const updatedEntry: ContextEntry = {
      ...entry,
      content: newContent,
      type: type !== undefined ? type : entry.type,
    };

    const updatedEntries = [...currentContext.entries];
    updatedEntries[entryIndex] = updatedEntry;

    const updatedContext: RelationshipContext = {
      entries: updatedEntries,
      total_chars: newTotalChars,
    };

    await db
      .update(relationships)
      .set({ context: updatedContext })
      .where(eq(relationships.id, relationshipId));

    return { success: true, context: updatedContext };
  }

  /**
   * Eliminar una entrada de contexto
   */
  async deleteEntry(relationshipId: string, entryIndex: number): Promise<{ success: boolean; context?: RelationshipContext; error?: string }> {
    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) {
      return { success: false, error: 'Relationship not found' };
    }

    const currentContext = (rel.context as RelationshipContext) || { entries: [], total_chars: 0 };

    if (entryIndex < 0 || entryIndex >= currentContext.entries.length) {
      return { success: false, error: 'Entry not found' };
    }

    const entry = currentContext.entries[entryIndex];
    const updatedEntries = currentContext.entries.filter((_, i) => i !== entryIndex);

    const updatedContext: RelationshipContext = {
      entries: updatedEntries,
      total_chars: currentContext.total_chars - entry.content.length,
    };

    await db
      .update(relationships)
      .set({ context: updatedContext })
      .where(eq(relationships.id, relationshipId));

    return { success: true, context: updatedContext };
  }

  /**
   * Obtener perspectiva de una cuenta en una relación
   */
  async getPerspective(relationshipId: string, accountId: string): Promise<RelationshipPerspective | null> {
    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) return null;

    if (rel.accountAId === accountId) {
      return rel.perspectiveA as RelationshipPerspective;
    } else if (rel.accountBId === accountId) {
      return rel.perspectiveB as RelationshipPerspective;
    }

    return null;
  }

  /**
   * Actualizar perspectiva de una cuenta
   */
  async updatePerspective(input: UpdatePerspectiveInput): Promise<{ success: boolean; perspective?: RelationshipPerspective; error?: string }> {
    const { relationshipId, accountId, savedName, tags, status } = input;

    const [rel] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (!rel) {
      return { success: false, error: 'Relationship not found' };
    }

    let perspectiveField: 'perspectiveA' | 'perspectiveB';
    let currentPerspective: RelationshipPerspective;

    if (rel.accountAId === accountId) {
      perspectiveField = 'perspectiveA';
      currentPerspective = rel.perspectiveA as RelationshipPerspective;
    } else if (rel.accountBId === accountId) {
      perspectiveField = 'perspectiveB';
      currentPerspective = rel.perspectiveB as RelationshipPerspective;
    } else {
      return { success: false, error: 'Account not part of this relationship' };
    }

    const updatedPerspective: RelationshipPerspective = {
      saved_name: savedName !== undefined ? savedName : currentPerspective.saved_name,
      tags: tags !== undefined ? tags : currentPerspective.tags,
      status: status !== undefined ? status : currentPerspective.status,
    };

    await db
      .update(relationships)
      .set({ [perspectiveField]: updatedPerspective })
      .where(eq(relationships.id, relationshipId));

    return { success: true, perspective: updatedPerspective };
  }

  /**
   * Obtener límite de caracteres disponibles
   */
  async getAvailableChars(relationshipId: string): Promise<{ used: number; available: number; max: number } | null> {
    const context = await this.getContext(relationshipId);
    if (!context) return null;

    return {
      used: context.total_chars,
      available: MAX_CONTEXT_CHARS - context.total_chars,
      max: MAX_CONTEXT_CHARS,
    };
  }

  /**
   * Obtener entradas filtradas por tipo
   */
  async getEntriesByType(relationshipId: string, type: 'note' | 'preference' | 'rule'): Promise<ContextEntry[]> {
    const context = await this.getContext(relationshipId);
    if (!context) return [];

    return context.entries.filter(e => e.type === type);
  }
}

export const relationshipContextService = new RelationshipContextService();
export default relationshipContextService;
