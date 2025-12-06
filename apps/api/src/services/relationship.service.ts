import { db } from '@fluxcore/db';
import {
  relationships,
  type RelationshipContext,
  type ContextEntry,
  type RelationshipPerspective,
} from '@fluxcore/db';
import { eq, and, or } from 'drizzle-orm';

const MAX_CONTEXT_CHARS = 2000;

export class RelationshipService {
  async createRelationship(accountAId: string, accountBId: string) {
    // Check if relationship already exists
    const existing = await db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.accountAId, accountAId), eq(relationships.accountBId, accountBId)),
          and(eq(relationships.accountAId, accountBId), eq(relationships.accountBId, accountAId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new relationship
    const [relationship] = await db
      .insert(relationships)
      .values({
        accountAId,
        accountBId,
      })
      .returning();

    return relationship;
  }

  async getRelationship(accountAId: string, accountBId: string) {
    const [relationship] = await db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.accountAId, accountAId), eq(relationships.accountBId, accountBId)),
          and(eq(relationships.accountAId, accountBId), eq(relationships.accountBId, accountAId))
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
    return await db
      .select()
      .from(relationships)
      .where(or(eq(relationships.accountAId, accountId), eq(relationships.accountBId, accountId)));
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
    const isAccountA = relationship.accountAId === accountId;
    const field = isAccountA ? 'perspectiveA' : 'perspectiveB';
    const currentPerspective = isAccountA
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
      created_at: new Date().toISOString(),
    };

    // Calculate new total chars
    const newTotalChars = context.total_chars + entry.content.length;

    if (newTotalChars > MAX_CONTEXT_CHARS) {
      throw new Error(`Context limit exceeded: ${newTotalChars}/${MAX_CONTEXT_CHARS} characters`);
    }

    const updatedContext: RelationshipContext = {
      entries: [...context.entries, newEntry],
      total_chars: newTotalChars,
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
}

export const relationshipService = new RelationshipService();
