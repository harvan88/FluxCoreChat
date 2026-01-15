/**
 * FluxCore: Billing & Usage Schemas
 * 
 * Tablas para tracking de uso y billing.
 * RAG-010: Billing y Usage Tracking
 */

import { pgTable, uuid, varchar, timestamp, text, integer, decimal, jsonb, index, uniqueIndex, date } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreMarketplaceSubscriptions } from './fluxcore-marketplace';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export type ResourceType = 'embedding' | 'retrieval' | 'document_processing' | 'storage' | 'api_call';
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
export type TransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'subscription';

// ════════════════════════════════════════════════════════════════════════════
// Usage Logs
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreUsageLogs = pgTable('fluxcore_usage_logs', {
    id: uuid('id').primaryKey().defaultRandom(),

    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    resourceType: varchar('resource_type', { length: 50 })
        .notNull()
        .$type<ResourceType>(),
    resourceId: uuid('resource_id'),
    operation: varchar('operation', { length: 50 }).notNull(),

    // Métricas
    tokensUsed: integer('tokens_used').default(0),
    chunksProcessed: integer('chunks_processed').default(0),
    apiCalls: integer('api_calls').default(1),
    processingTimeMs: integer('processing_time_ms').default(0),

    // Costo
    costCredits: decimal('cost_credits', { precision: 10, scale: 4 }).default('0'),

    // Contexto
    provider: varchar('provider', { length: 50 }),
    model: varchar('model', { length: 100 }),
    requestMetadata: jsonb('request_metadata').default({}),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    billingPeriodStart: date('billing_period_start'),
    billingPeriodEnd: date('billing_period_end'),
}, (table) => ({
    accountIdx: index('idx_usage_logs_account_drizzle').on(table.accountId),
    resourceIdx: index('idx_usage_logs_resource_drizzle').on(table.resourceType, table.resourceId),
    createdIdx: index('idx_usage_logs_created_drizzle').on(table.createdAt),
}));

export type FluxcoreUsageLog = typeof fluxcoreUsageLogs.$inferSelect;
export type NewFluxcoreUsageLog = typeof fluxcoreUsageLogs.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Account Credits
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreAccountCredits = pgTable('fluxcore_account_credits', {
    id: uuid('id').primaryKey().defaultRandom(),

    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    // Saldo
    balanceCredits: decimal('balance_credits', { precision: 12, scale: 4 }).default('0'),

    // Límites
    monthlyLimitCredits: decimal('monthly_limit_credits', { precision: 12, scale: 4 }),
    dailyLimitCredits: decimal('daily_limit_credits', { precision: 12, scale: 4 }),

    // Uso actual
    usedThisMonth: decimal('used_this_month', { precision: 12, scale: 4 }).default('0'),
    usedToday: decimal('used_today', { precision: 12, scale: 4 }).default('0'),

    // Plan
    planType: varchar('plan_type', { length: 50 })
        .default('free')
        .$type<PlanType>(),

    // Stripe
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

    // Alertas
    alertThresholdPercent: integer('alert_threshold_percent').default(80),
    lastAlertSentAt: timestamp('last_alert_sent_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    accountIdx: uniqueIndex('idx_credits_account_unique').on(table.accountId),
}));

export type FluxcoreAccountCredits = typeof fluxcoreAccountCredits.$inferSelect;
export type NewFluxcoreAccountCredits = typeof fluxcoreAccountCredits.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Credit Transactions
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreCreditTransactions = pgTable('fluxcore_credit_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),

    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    transactionType: varchar('transaction_type', { length: 50 })
        .notNull()
        .$type<TransactionType>(),

    amountCredits: decimal('amount_credits', { precision: 12, scale: 4 }).notNull(),
    description: text('description'),

    // Referencias
    usageLogId: uuid('usage_log_id').references(() => fluxcoreUsageLogs.id),
    subscriptionId: uuid('subscription_id').references(() => fluxcoreMarketplaceSubscriptions.id),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),

    balanceAfter: decimal('balance_after', { precision: 12, scale: 4 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    accountIdx: index('idx_transactions_account_drizzle').on(table.accountId),
    typeIdx: index('idx_transactions_type_drizzle').on(table.transactionType),
}));

export type FluxcoreCreditTransaction = typeof fluxcoreCreditTransactions.$inferSelect;
export type NewFluxcoreCreditTransaction = typeof fluxcoreCreditTransactions.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Helper Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface UsageSummary {
    resourceType: ResourceType;
    totalTokens: number;
    totalCost: number;
    operationCount: number;
}

export interface AccountBillingInfo {
    accountId: string;
    planType: PlanType;
    balanceCredits: number;
    usedThisMonth: number;
    monthlyLimit?: number;
    usagePercentage: number;
}

export interface CreditPurchaseRequest {
    accountId: string;
    amountCredits: number;
    stripePaymentIntentId: string;
}
