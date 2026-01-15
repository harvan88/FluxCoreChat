/**
 * COR-004: Actor Service
 * 
 * Gestión de actores para trazabilidad completa de mensajes.
 * Un Actor puede ser: account, user, builtin_ai, extension
 */

import { db } from '@fluxcore/db';
import { actors } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

type ActorType = 'account' | 'user' | 'builtin_ai' | 'extension';

export class ActorService {
  /**
   * Crear un nuevo actor
   */
  async createActor(data: {
    actorType: ActorType;
    userId?: string;
    accountId?: string;
    extensionId?: string;
    displayName?: string;
  }) {
    const [actor] = await db
      .insert(actors)
      .values({
        actorType: data.actorType,
        userId: data.userId || null,
        accountId: data.accountId || null,
        extensionId: data.extensionId || null,
        displayName: data.displayName || null,
      })
      .returning();

    return actor;
  }

  /**
   * Obtener actor por ID
   */
  async getActorById(actorId: string) {
    const [actor] = await db
      .select()
      .from(actors)
      .where(eq(actors.id, actorId))
      .limit(1);

    return actor || null;
  }

  /**
   * Obtener actor por accountId
   * Crea uno si no existe (actor tipo 'account')
   */
  async getOrCreateActorForAccount(accountId: string, displayName?: string) {
    // Buscar actor existente para esta cuenta
    const [existing] = await db
      .select()
      .from(actors)
      .where(
        and(
          eq(actors.actorType, 'account'),
          eq(actors.accountId, accountId)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Crear nuevo actor para la cuenta
    const [actor] = await db
      .insert(actors)
      .values({
        actorType: 'account',
        accountId,
        displayName: displayName || null,
      })
      .returning();

    return actor;
  }

  /**
   * Obtener actor por extensionId
   */
  async getActorByExtensionId(extensionId: string) {
    const [actor] = await db
      .select()
      .from(actors)
      .where(eq(actors.extensionId, extensionId))
      .limit(1);

    return actor || null;
  }

  /**
   * Obtener actor builtin de FluxCore
   */
  async getFluxCoreActor() {
    return this.getActorByExtensionId('@fluxcore/fluxcore');
  }

  /**
   * Obtener todos los actores de tipo extensión
   */
  async getExtensionActors() {
    return await db
      .select()
      .from(actors)
      .where(eq(actors.actorType, 'extension'));
  }

  /**
   * Obtener todos los actores builtin (IA)
   */
  async getBuiltinActors() {
    return await db
      .select()
      .from(actors)
      .where(eq(actors.actorType, 'builtin_ai'));
  }

  /**
   * Actualizar displayName de un actor
   */
  async updateDisplayName(actorId: string, displayName: string) {
    const [updated] = await db
      .update(actors)
      .set({ displayName })
      .where(eq(actors.id, actorId))
      .returning();

    return updated;
  }

  /**
   * Obtener actores por tipo
   */
  async getActorsByType(actorType: ActorType) {
    return await db
      .select()
      .from(actors)
      .where(eq(actors.actorType, actorType));
  }
}

export const actorService = new ActorService();
