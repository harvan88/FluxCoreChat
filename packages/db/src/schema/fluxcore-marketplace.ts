/**
 * FluxCore: Marketplace Schemas
 * 
 * Tablas para el marketplace de Vector Stores, Instructions y Tools.
 * Incluye listings, suscripciones y reviews.
 * 
 * RAG-005: Marketplace de Vector Stores
 */

import { pgTable, uuid, varchar, timestamp, text, integer, boolean, bigint, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { fluxcoreVectorStores } from './fluxcore-vector-stores';
import { fluxcoreInstructions } from './fluxcore-instructions';
import { fluxcoreToolDefinitions } from './fluxcore-tools';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export type PricingModel = 'free' | 'one_time' | 'subscription' | 'usage';
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type LicenseType = 'personal' | 'commercial' | 'enterprise';
export type BillingPeriod = 'monthly' | 'yearly';

// ════════════════════════════════════════════════════════════════════════════
// Marketplace Listings
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreMarketplaceListings = pgTable('fluxcore_marketplace_listings', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Asset en venta
    vectorStoreId: uuid('vector_store_id')
        .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
    instructionId: uuid('instruction_id')
        .references(() => fluxcoreInstructions.id, { onDelete: 'cascade' }),
    toolDefinitionId: uuid('tool_definition_id')
        .references(() => fluxcoreToolDefinitions.id, { onDelete: 'cascade' }),

    // Vendedor
    sellerAccountId: uuid('seller_account_id')
        .notNull()
        .references(() => accounts.id),

    // Info del listing
    title: varchar('title', { length: 255 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }),
    longDescription: text('long_description'),
    category: varchar('category', { length: 100 }),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Pricing
    pricingModel: varchar('pricing_model', { length: 20 })
        .notNull()
        .default('free')
        .$type<PricingModel>(),
    priceCents: integer('price_cents').default(0),
    currency: varchar('currency', { length: 3 }).default('USD'),
    billingPeriod: varchar('billing_period', { length: 20 }).$type<BillingPeriod>(),
    usagePricePer1kTokens: integer('usage_price_per_1k_tokens'),

    // Estado
    status: varchar('status', { length: 20 })
        .notNull()
        .default('draft')
        .$type<ListingStatus>(),

    // Estadísticas
    totalSubscribers: integer('total_subscribers').default(0),
    totalRevenueCents: bigint('total_revenue_cents', { mode: 'number' }).default(0),
    totalQueries: bigint('total_queries', { mode: 'number' }).default(0),
    ratingAverage: numeric('rating_average', { precision: 3, scale: 2 }),
    ratingCount: integer('rating_count').default(0),

    // Preview
    previewEnabled: boolean('preview_enabled').default(true),
    previewChunkLimit: integer('preview_chunk_limit').default(5),

    // Licencia
    licenseType: varchar('license_type', { length: 50 })
        .default('personal')
        .$type<LicenseType>(),
    termsUrl: text('terms_url'),

    // Media
    coverImageUrl: text('cover_image_url'),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),
    demoUrl: text('demo_url'),

    // SEO
    searchKeywords: jsonb('search_keywords').$type<string[]>().default([]),
    featured: boolean('featured').default(false),
    featuredUntil: timestamp('featured_until'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
}, (table) => ({
    sellerIdx: index('idx_mp_listings_seller').on(table.sellerAccountId),
    statusIdx: index('idx_mp_listings_status').on(table.status),
    categoryIdx: index('idx_mp_listings_category').on(table.category),
}));

export type FluxcoreMarketplaceListing = typeof fluxcoreMarketplaceListings.$inferSelect;
export type NewFluxcoreMarketplaceListing = typeof fluxcoreMarketplaceListings.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Marketplace Subscriptions
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreMarketplaceSubscriptions = pgTable('fluxcore_marketplace_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),

    listingId: uuid('listing_id')
        .notNull()
        .references(() => fluxcoreMarketplaceListings.id, { onDelete: 'cascade' }),
    subscriberAccountId: uuid('subscriber_account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    // Estado
    status: varchar('status', { length: 20 })
        .notNull()
        .default('active')
        .$type<SubscriptionStatus>(),

    // Billing
    startedAt: timestamp('started_at').defaultNow().notNull(),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelledAt: timestamp('cancelled_at'),

    // Uso
    tokensUsedThisPeriod: bigint('tokens_used_this_period', { mode: 'number' }).default(0),
    queriesThisPeriod: integer('queries_this_period').default(0),
    tokensUsedTotal: bigint('tokens_used_total', { mode: 'number' }).default(0),
    queriesTotal: integer('queries_total').default(0),

    // Pagos
    externalSubscriptionId: varchar('external_subscription_id', { length: 255 }),
    lastPaymentAt: timestamp('last_payment_at'),
    nextPaymentAt: timestamp('next_payment_at'),
    totalPaidCents: bigint('total_paid_cents', { mode: 'number' }).default(0),

    // Acceso
    accessMode: varchar('access_mode', { length: 20 }).default('read'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    subscriberIdx: index('idx_mp_subscriptions_subscriber').on(table.subscriberAccountId),
    listingIdx: index('idx_mp_subscriptions_listing').on(table.listingId),
    uniqueSubscription: uniqueIndex('idx_mp_sub_unique').on(table.listingId, table.subscriberAccountId),
}));

export type FluxcoreMarketplaceSubscription = typeof fluxcoreMarketplaceSubscriptions.$inferSelect;
export type NewFluxcoreMarketplaceSubscription = typeof fluxcoreMarketplaceSubscriptions.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Marketplace Reviews
// ════════════════════════════════════════════════════════════════════════════

export const fluxcoreMarketplaceReviews = pgTable('fluxcore_marketplace_reviews', {
    id: uuid('id').primaryKey().defaultRandom(),

    listingId: uuid('listing_id')
        .notNull()
        .references(() => fluxcoreMarketplaceListings.id, { onDelete: 'cascade' }),
    reviewerAccountId: uuid('reviewer_account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id')
        .references(() => fluxcoreMarketplaceSubscriptions.id),

    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content'),

    status: varchar('status', { length: 20 }).default('published'),
    helpfulCount: integer('helpful_count').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    listingIdx: index('idx_mp_reviews_listing').on(table.listingId),
    uniqueReview: uniqueIndex('idx_mp_review_unique').on(table.listingId, table.reviewerAccountId),
}));

export type FluxcoreMarketplaceReview = typeof fluxcoreMarketplaceReviews.$inferSelect;
export type NewFluxcoreMarketplaceReview = typeof fluxcoreMarketplaceReviews.$inferInsert;

// ════════════════════════════════════════════════════════════════════════════
// Helper Interfaces
// ════════════════════════════════════════════════════════════════════════════

export interface MarketplaceListingDetails extends FluxcoreMarketplaceListing {
    seller?: {
        id: string;
        displayName: string;
        verified: boolean;
    };
    asset?: {
        name: string;
        type: 'vector_store' | 'instruction' | 'tool';
        fileCount?: number;
        chunkCount?: number;
    };
}

export interface MarketplaceSearchFilter {
    query?: string;
    category?: string;
    pricingModel?: PricingModel;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    tags?: string[];
    sortBy?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
    page?: number;
    limit?: number;
}
