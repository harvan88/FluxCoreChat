import { db } from '@fluxcore/db';
import {
  relationships,
  conversations,
  actors,
  type RelationshipContext,
  type ContextEntry,
  type RelationshipPerspective,
} from '@fluxcore/db';
import { eq, and, or } from 'drizzle-orm';
import { validateRelationshipContext, validateContextEntry } from '../utils/context-limits';

export class RelationshipService {
  /**
   * Resolve an accountId to its actor UUID.
   * Every account should have a corresponding actor row.
   */
  private async resolveActorId(accountId: string): Promise<string> {
    const [actor] = await db
      .select({ id: actors.id })
      .from(actors)
      .where(eq(actors.accountId, accountId))
      .limit(1);

    if (!actor) {
      throw new Error(`No actor found for account ${accountId}`);
    }
    return actor.id;
  }

  /**
   * Resolve an actorId back to an accountId (for backward compat with callers expecting accountId).
   */
  private async resolveAccountId(actorId: string): Promise<string | null> {
    const [actor] = await db
      .select({ accountId: actors.accountId })
      .from(actors)
      .where(eq(actors.id, actorId))
      .limit(1);

    return actor?.accountId ?? null;
  }

  async createRelationship(accountAId: string, accountBId: string) {
    const actorAId = await this.resolveActorId(accountAId);
    const actorBId = await this.resolveActorId(accountBId);

    // Check if relationship already exists
    const existing = await db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.actorAId, actorAId), eq(relationships.actorBId, actorBId)),
          and(eq(relationships.actorAId, actorBId), eq(relationships.actorBId, actorAId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // BUG-003: Asegurar que existe conversación para relación existente
      const existingConv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.relationshipId, existing[0].id))
        .limit(1);

      if (existingConv.length === 0) {
        await db.insert(conversations).values({
          relationshipId: existing[0].id,
          channel: 'web',
        });
      }

      return existing[0];
    }

    // Create new relationship
    const [relationship] = await db
      .insert(relationships)
      .values({
        actorAId,
        actorBId,
      })
      .returning();

    // BUG-003: Crear conversación automáticamente al crear relación
    await db.insert(conversations).values({
      relationshipId: relationship.id,
      channel: 'web',
    });

    return relationship;
  }

  async getRelationship(accountAId: string, accountBId: string) {
    const actorAId = await this.resolveActorId(accountAId);
    const actorBId = await this.resolveActorId(accountBId);

    const [relationship] = await db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.actorAId, actorAId), eq(relationships.actorBId, actorBId)),
          and(eq(relationships.actorAId, actorBId), eq(relationships.actorBId, actorAId))
        )
      )
      .limit(1);

    return relationship || null;
  }

  async getRelationshipById(relationshipId: string) {
    const [relationship] = await db
      .select()
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    return relationship || null;
  }

  async getRelationshipsByAccountId(accountId: string) {
    const actorId = await this.resolveActorId(accountId);
    return await db
      .select()
      .from(relationships)
      .where(or(eq(relationships.actorAId, actorId), eq(relationships.actorBId, actorId)));
  }

  /**
   * Given a relationship and an accountId, determine which side (A or B) this account is on.
   * Returns the actorId for the other side.
   */
  async getOtherActorId(relationship: any, accountId: string): Promise<string | null> {
    const actorId = await this.resolveActorId(accountId);
    if (relationship.actorAId === actorId) return relationship.actorBId;
    if (relationship.actorBId === actorId) return relationship.actorAId;
    return null;
  }

  /**
   * Check if an accountId is actor A in the relationship.
   */
  async isActorA(relationship: any, accountId: string): Promise<boolean> {
    const actorId = await this.resolveActorId(accountId);
    return relationship.actorAId === actorId;
  }

  async updatePerspective(
    relationshipId: string,
    accountId: string,
    perspective: Partial<RelationshipPerspective>
  ) {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Determine which perspective to update
    const isA = await this.isActorA(relationship, accountId);
    const field = isA ? 'perspectiveA' : 'perspectiveB';
    const currentPerspective = isA
      ? (relationship.perspectiveA as RelationshipPerspective)
      : (relationship.perspectiveB as RelationshipPerspective);

    const updatedPerspective = {
      ...currentPerspective,
      ...perspective,
    };

    const [updated] = await db
      .update(relationships)
      .set({
        [field]: updatedPerspective,
      })
      .where(eq(relationships.id, relationshipId))
      .returning();

    return updated;
  }

  async addContextEntry(relationshipId: string, entry: Omit<ContextEntry, 'created_at'>) {
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const context = relationship.context as RelationshipContext;
    const newEntry: ContextEntry = {
      ...entry,
      allow_automated_use: (entry as any).allow_automated_use ?? false,
      created_at: new Date().toISOString(),
    };

    // COR-006: Validación centralizada de límites
    const entryValidation = validateContextEntry(entry.content);
    if (!entryValidation.valid) {
      throw new Error(entryValidation.error);
    }

    const contextValidation = validateRelationshipContext(context.total_chars, entry.content.length);
    if (!contextValidation.valid) {
      throw new Error(contextValidation.error);
    }

    const updatedContext: RelationshipContext = {
      entries: [...context.entries, newEntry],
      total_chars: context.total_chars + entry.content.length,
    };

    const [updated] = await db
      .update(relationships)
      .set({
        context: updatedContext,
        lastInteraction: new Date(),
      })
      .where(eq(relationships.id, relationshipId))
      .returning();

    return updated;
  }

  async updateLastInteraction(relationshipId: string) {
    await db
      .update(relationships)
      .set({
        lastInteraction: new Date(),
      })
      .where(eq(relationships.id, relationshipId));
  }

  async deleteRelationship(relationshipId: string, userId: string) {
    // Verificar que la relación existe
    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Verificar que el usuario es dueño de alguna de las cuentas en la relación
    const { accountService } = await import('./account.service');
    const userAccounts = await accountService.getAccountsByUserId(userId);
    const userAccountIds = userAccounts.map(a => a.id);

    // Resolve actor IDs to account IDs for authorization check
    const accountAId = await this.resolveAccountId(relationship.actorAId);
    const accountBId = await this.resolveAccountId(relationship.actorBId);

    const isOwner = (accountAId && userAccountIds.includes(accountAId)) ||
      (accountBId && userAccountIds.includes(accountBId));

    if (!isOwner) {
      throw new Error('Not authorized to delete this relationship');
    }

    // Eliminar conversaciones asociadas primero
    await db
      .delete(conversations)
      .where(eq(conversations.relationshipId, relationshipId));

    // Eliminar la relación
    await db
      .delete(relationships)
      .where(eq(relationships.id, relationshipId));

    console.log(`[RelationshipService] Deleted relationship ${relationshipId} and associated conversations`);
  }
}

export const relationshipService = new RelationshipService();
