/**
 * Context Access Service
 * FC-157: Acceso controlado a contextos para extensiones
 */

import { db, accounts, relationships, conversations, messages, extensionContexts } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import { permissionValidator } from './permission-validator.service';

export interface ContextAccessParams {
  extensionId: string;
  accountId: string;
  grantedPermissions: string[];
  relationshipId?: string;
  conversationId?: string;
}

export interface ExtensionContextData {
  account?: {
    id: string;
    username: string;
    displayName: string;
    profile: Record<string, any>;
    privateContext?: string;
  };
  relationship?: {
    id: string;
    context: any;
    perspectiveA: any;
    perspectiveB: any;
    lastInteraction?: string;
  };
  conversation?: {
    id: string;
    channel: string;
    status: string;
    lastMessageAt?: string;
  };
  messageHistory?: Array<{
    id: string;
    content: any;
    type: string;
    senderAccountId: string;
    createdAt: string;
  }>;
  overlays?: Record<string, any>;
}

class ContextAccessService {
  /**
   * Obtener contexto completo para una extensión
   */
  async getContext(params: ContextAccessParams): Promise<ExtensionContextData> {
    const { extensionId, accountId, grantedPermissions, relationshipId, conversationId } = params;
    const context: ExtensionContextData = {};

    // Obtener datos de cuenta
    if (permissionValidator.canReadContext(grantedPermissions, 'public').allowed) {
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (account) {
        context.account = {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          profile: account.profile as Record<string, any>,
        };

        // Agregar contexto privado si tiene permiso
        if (permissionValidator.canReadContext(grantedPermissions, 'private').allowed) {
          context.account.privateContext = account.privateContext || undefined;
        }
      }
    }

    // Obtener datos de relación
    if (relationshipId && permissionValidator.canReadContext(grantedPermissions, 'relationship').allowed) {
      const [relationship] = await db
        .select()
        .from(relationships)
        .where(eq(relationships.id, relationshipId))
        .limit(1);

      if (relationship) {
        context.relationship = {
          id: relationship.id,
          context: relationship.context,
          perspectiveA: relationship.perspectiveA,
          perspectiveB: relationship.perspectiveB,
          lastInteraction: relationship.lastInteraction?.toISOString(),
        };
      }
    }

    // Obtener datos de conversación
    if (conversationId) {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conversation) {
        context.conversation = {
          id: conversation.id,
          channel: conversation.channel,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt?.toISOString(),
        };
      }

      // Obtener historial de mensajes si tiene permiso
      if (permissionValidator.canReadContext(grantedPermissions, 'history').allowed) {
        const messageHistory = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt))
          .limit(50);

        context.messageHistory = messageHistory.map((msg) => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          senderAccountId: msg.senderAccountId,
          createdAt: msg.createdAt.toISOString(),
        }));
      }
    }

    // Obtener overlays de la extensión si tiene permiso
    if (permissionValidator.canReadContext(grantedPermissions, 'overlay').allowed) {
      const overlays = await this.getOverlays(extensionId, accountId, relationshipId, conversationId);
      if (Object.keys(overlays).length > 0) {
        context.overlays = overlays;
      }
    }

    return context;
  }

  /**
   * Obtener overlays de una extensión
   */
  async getOverlays(
    extensionId: string,
    accountId?: string,
    relationshipId?: string,
    conversationId?: string
  ): Promise<Record<string, any>> {
    const conditions = [eq(extensionContexts.extensionId, extensionId)];

    if (accountId) {
      conditions.push(eq(extensionContexts.accountId, accountId));
    }
    if (relationshipId) {
      conditions.push(eq(extensionContexts.relationshipId, relationshipId));
    }
    if (conversationId) {
      conditions.push(eq(extensionContexts.conversationId, conversationId));
    }

    const overlayRecords = await db
      .select()
      .from(extensionContexts)
      .where(and(...conditions));

    const overlays: Record<string, any> = {};
    for (const record of overlayRecords) {
      overlays[record.contextType] = record.payload;
    }
    return overlays;
  }

  /**
   * Guardar overlay de una extensión
   */
  async saveOverlay(
    extensionId: string,
    contextType: string,
    payload: Record<string, any>,
    options: {
      accountId?: string;
      relationshipId?: string;
      conversationId?: string;
    }
  ) {
    const { accountId, relationshipId, conversationId } = options;

    // Verificar que solo una FK esté presente
    const fkCount = [accountId, relationshipId, conversationId].filter(Boolean).length;
    if (fkCount !== 1) {
      throw new Error('Exactly one of accountId, relationshipId, or conversationId must be provided');
    }

    // Buscar overlay existente
    const conditions = [
      eq(extensionContexts.extensionId, extensionId),
      eq(extensionContexts.contextType, contextType),
    ];

    if (accountId) conditions.push(eq(extensionContexts.accountId, accountId));
    if (relationshipId) conditions.push(eq(extensionContexts.relationshipId, relationshipId));
    if (conversationId) conditions.push(eq(extensionContexts.conversationId, conversationId));

    const [existing] = await db
      .select()
      .from(extensionContexts)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      // Actualizar existente
      const [updated] = await db
        .update(extensionContexts)
        .set({ payload, updatedAt: new Date() })
        .where(eq(extensionContexts.id, existing.id))
        .returning();
      return updated;
    } else {
      // Crear nuevo
      const [created] = await db
        .insert(extensionContexts)
        .values({
          extensionId,
          contextType,
          payload,
          accountId: accountId || null,
          relationshipId: relationshipId || null,
          conversationId: conversationId || null,
        })
        .returning();
      return created;
    }
  }

  /**
   * Eliminar overlay de una extensión
   */
  async deleteOverlay(extensionId: string, contextType: string, entityId: string) {
    return db
      .delete(extensionContexts)
      .where(
        and(
          eq(extensionContexts.extensionId, extensionId),
          eq(extensionContexts.contextType, contextType),
          eq(extensionContexts.id, entityId)
        )
      )
      .returning();
  }
}

export const contextAccess = new ContextAccessService();
