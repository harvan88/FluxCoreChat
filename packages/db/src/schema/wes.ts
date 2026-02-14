
import { pgTable, uuid, varchar, timestamp, jsonb, text, real, integer, boolean, unique, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relationships } from './relationships';

export const fluxcoreWorkDefinitions = pgTable('fluxcore_work_definitions', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    typeId: text('type_id').notNull(),
    version: varchar('version', { length: 20 }).notNull(), // SemVer
    definitionJson: jsonb('definition_json').notNull(), // schema, fsm, policies
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deprecatedAt: timestamp('deprecated_at'),
}, (table) => ({
    unq: unique().on(table.accountId, table.typeId, table.version),
}));

export const fluxcoreDecisionEvents = pgTable('fluxcore_decision_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    messageId: uuid('message_id'),
    input: jsonb('input').notNull(), // Message original + context
    proposedWork: jsonb('proposed_work'), // Can be null (ProposedWork JSON)
    modelInfo: jsonb('model_info'),
    latencyMs: integer('latency_ms'),
    tokens: jsonb('tokens'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fluxcoreProposedWorks = pgTable('fluxcore_proposed_works', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    conversationId: varchar('conversation_id', { length: 255 }).notNull(),
    decisionEventId: uuid('decision_event_id').notNull().references(() => fluxcoreDecisionEvents.id),
    workDefinitionId: uuid('work_definition_id').references(() => fluxcoreWorkDefinitions.id),
    intent: text('intent'),
    candidateSlots: jsonb('candidate_slots').notNull(), // Array of {path, value, evidence}
    confidence: real('confidence'),
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    evaluatedAt: timestamp('evaluated_at'),
    resolution: varchar('resolution', { length: 50 }).notNull(), // 'opened' | 'discarded' | 'pending'
    resultingWorkId: uuid('resulting_work_id'), // Nullable, populated when work is opened
});

export const fluxcoreWorks = pgTable('fluxcore_works', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    workDefinitionId: uuid('work_definition_id').notNull().references(() => fluxcoreWorkDefinitions.id),
    workDefinitionVersion: varchar('work_definition_version', { length: 20 }).notNull(),
    relationshipId: uuid('relationship_id').references(() => relationships.id),
    conversationId: varchar('conversation_id', { length: 255 }),
    aggregateKey: text('aggregate_key'),
    state: varchar('state', { length: 50 }).notNull(), // CREATED, ACTIVE, etc.
    revision: integer('revision').default(1).notNull(),
    expiresAt: timestamp('expires_at'),
    suspendedReason: text('suspended_reason'),
    cancelledReason: text('cancelled_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    accRelConvStateIdx: index('fluxcore_works_acc_rel_conv_state_idx').on(table.accountId, table.relationshipId, table.conversationId, table.state),
    accAggregateKeyIdx: index('fluxcore_works_acc_aggregate_key_idx').on(table.accountId, table.aggregateKey),
}));

export const fluxcoreWorkSlots = pgTable('fluxcore_work_slots', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    workId: uuid('work_id').notNull().references(() => fluxcoreWorks.id),
    path: text('path').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    value: jsonb('value'),
    status: varchar('status', { length: 20 }).notNull(), // proposed | committed
    immutable: boolean('immutable').default(false).notNull(),
    setBy: varchar('set_by', { length: 50 }).notNull(),
    setAt: timestamp('set_at').defaultNow().notNull(),
    evidence: jsonb('evidence'),
    semanticConfirmedAt: timestamp('semantic_confirmed_at'),
    semanticContextId: uuid('semantic_context_id'),
}, (table) => ({
    unq: unique().on(table.workId, table.path),
}));

export const fluxcoreWorkEvents = pgTable('fluxcore_work_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    workId: uuid('work_id').notNull().references(() => fluxcoreWorks.id),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    actor: varchar('actor', { length: 50 }).notNull(),
    traceId: varchar('trace_id', { length: 255 }).notNull(),
    workRevision: integer('work_revision').notNull(),
    delta: jsonb('delta'),
    evidenceRef: jsonb('evidence_ref'),
    semanticContextId: uuid('semantic_context_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workCreatedIdx: index('fluxcore_work_events_work_created_idx').on(table.workId, table.createdAt),
}));

export const fluxcoreSemanticContexts = pgTable('fluxcore_semantic_contexts', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    workId: uuid('work_id').references(() => fluxcoreWorks.id),
    conversationId: varchar('conversation_id', { length: 255 }).notNull(),
    slotPath: text('slot_path').notNull(),
    proposedValue: jsonb('proposed_value').notNull(),
    requestMessageId: uuid('request_message_id'),
    requestEventId: uuid('request_event_id'),
    status: varchar('status', { length: 20 }).notNull(), // pending | consumed | expired
    consumedAt: timestamp('consumed_at'),
    consumedByWorkId: uuid('consumed_by_work_id'),
    consumedByMessageId: uuid('consumed_by_message_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    accConvStatusIdx: index('fluxcore_semantic_contexts_acc_conv_status_idx').on(table.accountId, table.conversationId, table.status),
}));

export const fluxcoreExternalEffects = pgTable('fluxcore_external_effects', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    workId: uuid('work_id').notNull().references(() => fluxcoreWorks.id),
    toolName: varchar('tool_name', { length: 255 }).notNull(),
    toolCallId: varchar('tool_call_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    request: jsonb('request'),
    response: jsonb('response'),
    status: varchar('status', { length: 20 }).notNull(), // success | recoverable_error | fatal_error
    claimId: uuid('claim_id'),
    startedAt: timestamp('started_at').notNull(),
    finishedAt: timestamp('finished_at'),
}, (table) => ({
    unq: unique().on(table.accountId, table.idempotencyKey),
}));

export const fluxcoreExternalEffectClaims = pgTable('fluxcore_external_effect_claims', {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull().references(() => accounts.id),
    semanticContextId: uuid('semantic_context_id').notNull().references(() => fluxcoreSemanticContexts.id),
    workId: uuid('work_id').notNull().references(() => fluxcoreWorks.id),
    effectType: varchar('effect_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // claimed | completed | aborted
    toolCallId: varchar('tool_call_id', { length: 255 }),
    claimedAt: timestamp('claimed_at').defaultNow().notNull(),
    releasedAt: timestamp('released_at'),
    externalEffectId: uuid('external_effect_id').references(() => fluxcoreExternalEffects.id),
});

// Types
export type FluxcoreWorkDefinition = typeof fluxcoreWorkDefinitions.$inferSelect;
export type NewFluxcoreWorkDefinition = typeof fluxcoreWorkDefinitions.$inferInsert;

export type FluxcoreDecisionEvent = typeof fluxcoreDecisionEvents.$inferSelect;
export type NewFluxcoreDecisionEvent = typeof fluxcoreDecisionEvents.$inferInsert;

export type FluxcoreProposedWork = typeof fluxcoreProposedWorks.$inferSelect;
export type NewFluxcoreProposedWork = typeof fluxcoreProposedWorks.$inferInsert;

export type FluxcoreWork = typeof fluxcoreWorks.$inferSelect;
export type NewFluxcoreWork = typeof fluxcoreWorks.$inferInsert;

export type FluxcoreWorkSlot = typeof fluxcoreWorkSlots.$inferSelect;
export type NewFluxcoreWorkSlot = typeof fluxcoreWorkSlots.$inferInsert;

export type FluxcoreWorkEvent = typeof fluxcoreWorkEvents.$inferSelect;
export type NewFluxcoreWorkEvent = typeof fluxcoreWorkEvents.$inferInsert;

export type FluxcoreSemanticContext = typeof fluxcoreSemanticContexts.$inferSelect;
export type NewFluxcoreSemanticContext = typeof fluxcoreSemanticContexts.$inferInsert;

export type FluxcoreExternalEffect = typeof fluxcoreExternalEffects.$inferSelect;
export type NewFluxcoreExternalEffect = typeof fluxcoreExternalEffects.$inferInsert;

export type FluxcoreExternalEffectClaim = typeof fluxcoreExternalEffectClaims.$inferSelect;
export type NewFluxcoreExternalEffectClaim = typeof fluxcoreExternalEffectClaims.$inferInsert;
