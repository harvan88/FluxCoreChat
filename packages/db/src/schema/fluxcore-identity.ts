import { pgTable, uuid, varchar, timestamp, real, integer, index, unique, text, bigint, bigserial } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreSignals } from './fluxcore-journal';

/**
 * FluxCore Ontological Identity System (PROJECTOR SPACE)
 *
 * These tables belong to the IdentityProjector.
 * They are DERIVED from the Kernel Journal — never the other way around.
 * The Kernel does not know these tables exist.
 */

/**
 * 1. Actors: Global Ontological Identity
 * Representative of a unique source of will in the universe.
 * Independent of accounts and channels.
 */
export const fluxcoreActors = pgTable('fluxcore_actors', {
    id: uuid('id').primaryKey().defaultRandom(),
    internalRef: text('internal_ref'),
    type: text('type').default('real').notNull(),             // 'provisional' | 'real'
    externalKey: text('external_key'),                         // visitor_token or other external id
    tenantId: text('tenant_id'),                               // account owning the widget
    createdFromSignal: bigint('created_from_signal', { mode: 'number' }).references(() => fluxcoreSignals.sequenceNumber),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    externalKeyIdx: index('idx_fluxcore_actors_external_key').on(table.externalKey),
    tenantIdx: index('idx_fluxcore_actors_tenant').on(table.tenantId),
}));

/**
 * 2. Addresses: Physical Entry Points
 * Representation of a technical channel endpoint.
 */
export const fluxcoreAddresses = pgTable('fluxcore_addresses', {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: varchar('driver_id', { length: 100 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    driverExtIdx: index('fluxcore_addresses_driver_ext_idx').on(table.driverId, table.externalId),
    unq: unique().on(table.driverId, table.externalId),
}));

/**
 * 3. Actor-Address Links: The Binding
 * Maps which physical addresses belong to which ontological actor.
 */
export const fluxcoreActorAddressLinks = pgTable('fluxcore_actor_address_links', {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').notNull().references(() => fluxcoreActors.id, { onDelete: 'cascade' }),
    addressId: uuid('address_id').notNull().references(() => fluxcoreAddresses.id, { onDelete: 'cascade' }),
    confidence: real('confidence').default(1.0).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    actorIdx: index('fluxcore_actor_address_links_actor_idx').on(table.actorId),
    addressIdx: index('fluxcore_actor_address_links_address_idx').on(table.addressId),
}));

/**
 * 4. Account-Actor Contexts (Relationships)
 * The commercial/semantic meaning of an actor for a specific account.
 * This is where accountId lives — in projector space, never in the Journal.
 */
export const fluxcoreAccountActorContexts = pgTable('fluxcore_account_actor_contexts', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').notNull().references(() => fluxcoreActors.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 255 }),
    metadata: text('metadata'),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    accActorIdx: index('fluxcore_account_actor_contexts_acc_actor_idx').on(table.accountId, table.actorId),
}));

/**
 * 5. Actor Identity Links — Provisional → Real Account Binding
 * Created by IdentityProjector when a widget visitor authenticates.
 */
export const fluxcoreActorIdentityLinks = pgTable('fluxcore_actor_identity_links', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    provisionalActorId: text('provisional_actor_id').notNull().unique(),
    realAccountId: text('real_account_id').notNull(),
    tenantId: text('tenant_id').notNull(),
    linkingSignalSeq: bigint('linking_signal_seq', { mode: 'number' }).notNull().references(() => fluxcoreSignals.sequenceNumber),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    realAccountIdx: index('idx_actor_identity_links_real').on(table.realAccountId),
}));

// Export types
export type FluxcoreActor = typeof fluxcoreActors.$inferSelect;
export type NewFluxcoreActor = typeof fluxcoreActors.$inferInsert;

export type FluxcoreAddress = typeof fluxcoreAddresses.$inferSelect;
export type NewFluxcoreAddress = typeof fluxcoreAddresses.$inferInsert;

export type FluxcoreActorAddressLink = typeof fluxcoreActorAddressLinks.$inferSelect;
export type NewFluxcoreActorAddressLink = typeof fluxcoreActorAddressLinks.$inferInsert;

export type FluxcoreAccountActorContext = typeof fluxcoreAccountActorContexts.$inferSelect;
export type NewFluxcoreAccountActorContext = typeof fluxcoreAccountActorContexts.$inferInsert;

export type FluxcoreActorIdentityLink = typeof fluxcoreActorIdentityLinks.$inferSelect;
export type NewFluxcoreActorIdentityLink = typeof fluxcoreActorIdentityLinks.$inferInsert;
