/**
 * Marketplace Service - Gestión del Marketplace de Assets
 * 
 * Permite publicar, buscar, comprar y gestionar listings de:
 * - Vector Stores
 * - Instructions
 * - Tools
 * 
 * RAG-005: Marketplace de Vector Stores
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreMarketplaceListings,
    fluxcoreMarketplaceSubscriptions,
    fluxcoreMarketplaceReviews,
    fluxcoreAssetPermissions,
    fluxcoreVectorStores,
    type FluxcoreMarketplaceListing,
    type NewFluxcoreMarketplaceListing,
    type FluxcoreMarketplaceSubscription,
    type NewFluxcoreMarketplaceSubscription,
    type MarketplaceSearchFilter,
    type MarketplaceListingDetails,
    type PricingModel,
    type ListingStatus,
} from '@fluxcore/db';
import { eq, and, or, ilike, gte, lte, desc, asc, sql } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// Main Marketplace Service
// ════════════════════════════════════════════════════════════════════════════

export class MarketplaceService {
    // ──────────────────────────────────────────────────────────────────────────
    // Listings CRUD
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Crea un nuevo listing en el marketplace
     */
    async createListing(data: NewFluxcoreMarketplaceListing): Promise<FluxcoreMarketplaceListing> {
        const [listing] = await db
            .insert(fluxcoreMarketplaceListings)
            .values(data)
            .returning();
        return listing;
    }

    /**
     * Obtiene un listing por ID
     */
    async getListing(listingId: string): Promise<MarketplaceListingDetails | null> {
        const [listing] = await db
            .select()
            .from(fluxcoreMarketplaceListings)
            .where(eq(fluxcoreMarketplaceListings.id, listingId))
            .limit(1);

        if (!listing) return null;

        // Enriquecer con info del asset
        let asset: MarketplaceListingDetails['asset'] | undefined;
        if (listing.vectorStoreId) {
            const [vs] = await db
                .select({ name: fluxcoreVectorStores.name })
                .from(fluxcoreVectorStores)
                .where(eq(fluxcoreVectorStores.id, listing.vectorStoreId))
                .limit(1);
            if (vs) {
                asset = { name: vs.name, type: 'vector_store' };
            }
        }

        return { ...listing, asset };
    }

    /**
     * Actualiza un listing
     */
    async updateListing(
        listingId: string,
        updates: Partial<NewFluxcoreMarketplaceListing>
    ): Promise<FluxcoreMarketplaceListing> {
        const [listing] = await db
            .update(fluxcoreMarketplaceListings)
            .set(updates)
            .where(eq(fluxcoreMarketplaceListings.id, listingId))
            .returning();
        return listing;
    }

    /**
     * Publica un listing (cambia status a pending_review o active)
     */
    async publishListing(listingId: string): Promise<FluxcoreMarketplaceListing> {
        return this.updateListing(listingId, {
            status: 'active',  // En producción: 'pending_review' para moderación
            publishedAt: new Date(),
        });
    }

    /**
     * Archiva un listing
     */
    async archiveListing(listingId: string): Promise<FluxcoreMarketplaceListing> {
        return this.updateListing(listingId, { status: 'archived' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Búsqueda
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Busca listings en el marketplace
     */
    async searchListings(filter: MarketplaceSearchFilter): Promise<{
        listings: FluxcoreMarketplaceListing[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const offset = (page - 1) * limit;

        // Construir condiciones
        const conditions = [eq(fluxcoreMarketplaceListings.status, 'active')];

        if (filter.query) {
            conditions.push(
                or(
                    ilike(fluxcoreMarketplaceListings.title, `%${filter.query}%`),
                    ilike(fluxcoreMarketplaceListings.shortDescription, `%${filter.query}%`)
                )!
            );
        }

        if (filter.category) {
            conditions.push(eq(fluxcoreMarketplaceListings.category, filter.category));
        }

        if (filter.pricingModel) {
            conditions.push(eq(fluxcoreMarketplaceListings.pricingModel, filter.pricingModel));
        }

        if (filter.minPrice !== undefined) {
            conditions.push(gte(fluxcoreMarketplaceListings.priceCents, filter.minPrice * 100));
        }

        if (filter.maxPrice !== undefined) {
            conditions.push(lte(fluxcoreMarketplaceListings.priceCents, filter.maxPrice * 100));
        }

        // Ordenamiento
        let orderBy;
        switch (filter.sortBy) {
            case 'popular':
                orderBy = desc(fluxcoreMarketplaceListings.totalSubscribers);
                break;
            case 'rating':
                orderBy = desc(fluxcoreMarketplaceListings.ratingAverage);
                break;
            case 'price_asc':
                orderBy = asc(fluxcoreMarketplaceListings.priceCents);
                break;
            case 'price_desc':
                orderBy = desc(fluxcoreMarketplaceListings.priceCents);
                break;
            case 'newest':
            default:
                orderBy = desc(fluxcoreMarketplaceListings.publishedAt);
        }

        // Ejecutar query
        const listings = await db
            .select()
            .from(fluxcoreMarketplaceListings)
            .where(and(...conditions))
            .orderBy(orderBy)
            .offset(offset)
            .limit(limit);

        // Contar total
        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(fluxcoreMarketplaceListings)
            .where(and(...conditions));

        return {
            listings,
            total: countResult?.count || 0,
            page,
            limit,
        };
    }

    /**
     * Obtiene listings destacados
     */
    async getFeaturedListings(limit = 10): Promise<FluxcoreMarketplaceListing[]> {
        return db
            .select()
            .from(fluxcoreMarketplaceListings)
            .where(and(
                eq(fluxcoreMarketplaceListings.status, 'active'),
                eq(fluxcoreMarketplaceListings.featured, true)
            ))
            .orderBy(desc(fluxcoreMarketplaceListings.totalSubscribers))
            .limit(limit);
    }

    /**
     * Obtiene listings de un vendedor
     */
    async getSellerListings(sellerAccountId: string): Promise<FluxcoreMarketplaceListing[]> {
        return db
            .select()
            .from(fluxcoreMarketplaceListings)
            .where(eq(fluxcoreMarketplaceListings.sellerAccountId, sellerAccountId))
            .orderBy(desc(fluxcoreMarketplaceListings.createdAt));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Suscripciones
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Suscribe a un usuario a un listing
     */
    async subscribe(
        listingId: string,
        subscriberAccountId: string
    ): Promise<FluxcoreMarketplaceSubscription> {
        // Obtener listing
        const listing = await this.getListing(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }

        // Crear suscripción
        const [subscription] = await db
            .insert(fluxcoreMarketplaceSubscriptions)
            .values({
                listingId,
                subscriberAccountId,
                status: 'active',
                startedAt: new Date(),
                currentPeriodStart: new Date(),
            })
            .returning();

        // Crear permiso de acceso al asset
        if (listing.vectorStoreId) {
            await db.insert(fluxcoreAssetPermissions).values({
                vectorStoreId: listing.vectorStoreId,
                granteeAccountId: subscriberAccountId,
                permissionLevel: 'read',
                source: 'marketplace',
                grantedByAccountId: listing.sellerAccountId,
            }).onConflictDoNothing();
        }

        return subscription;
    }

    /**
     * Cancela una suscripción
     */
    async cancelSubscription(subscriptionId: string): Promise<FluxcoreMarketplaceSubscription> {
        const [subscription] = await db
            .update(fluxcoreMarketplaceSubscriptions)
            .set({
                status: 'cancelled',
                cancelledAt: new Date(),
            })
            .where(eq(fluxcoreMarketplaceSubscriptions.id, subscriptionId))
            .returning();

        // TODO: Revocar permiso de acceso

        return subscription;
    }

    /**
     * Obtiene suscripciones de un usuario
     */
    async getUserSubscriptions(
        accountId: string
    ): Promise<FluxcoreMarketplaceSubscription[]> {
        return db
            .select()
            .from(fluxcoreMarketplaceSubscriptions)
            .where(eq(fluxcoreMarketplaceSubscriptions.subscriberAccountId, accountId))
            .orderBy(desc(fluxcoreMarketplaceSubscriptions.startedAt));
    }

    /**
     * Verifica si un usuario tiene suscripción activa a un listing
     */
    async hasActiveSubscription(
        listingId: string,
        accountId: string
    ): Promise<boolean> {
        const [subscription] = await db
            .select()
            .from(fluxcoreMarketplaceSubscriptions)
            .where(and(
                eq(fluxcoreMarketplaceSubscriptions.listingId, listingId),
                eq(fluxcoreMarketplaceSubscriptions.subscriberAccountId, accountId),
                eq(fluxcoreMarketplaceSubscriptions.status, 'active')
            ))
            .limit(1);

        return !!subscription;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reviews
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Añade una review a un listing
     */
    async addReview(
        listingId: string,
        reviewerAccountId: string,
        rating: number,
        title?: string,
        content?: string
    ): Promise<void> {
        await db.insert(fluxcoreMarketplaceReviews).values({
            listingId,
            reviewerAccountId,
            rating,
            title,
            content,
            status: 'published',
        }).onConflictDoUpdate({
            target: [fluxcoreMarketplaceReviews.listingId, fluxcoreMarketplaceReviews.reviewerAccountId],
            set: { rating, title, content },
        });
    }

    /**
     * Obtiene reviews de un listing
     */
    async getListingReviews(listingId: string): Promise<Array<{
        id: string;
        rating: number;
        title: string | null;
        content: string | null;
        createdAt: Date;
    }>> {
        return db
            .select({
                id: fluxcoreMarketplaceReviews.id,
                rating: fluxcoreMarketplaceReviews.rating,
                title: fluxcoreMarketplaceReviews.title,
                content: fluxcoreMarketplaceReviews.content,
                createdAt: fluxcoreMarketplaceReviews.createdAt,
            })
            .from(fluxcoreMarketplaceReviews)
            .where(and(
                eq(fluxcoreMarketplaceReviews.listingId, listingId),
                eq(fluxcoreMarketplaceReviews.status, 'published')
            ))
            .orderBy(desc(fluxcoreMarketplaceReviews.createdAt));
    }
}

// Singleton export
export const marketplaceService = new MarketplaceService();
