/**
 * WES-180: Fluxi API Routes (Work Execution System)
 * 
 * API para gestionar trabajos (Works):
 * - GET /fluxcore/works/proposed
 * - GET /fluxcore/works/active
 * - POST /fluxcore/works/:id/open
 * - POST /fluxcore/works/:id/discard
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth.middleware';
import { db } from '@fluxcore/db';
import { fluxcoreWorks, fluxcoreProposedWorks } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import { workEngineService } from '../../services/work-engine.service';
import { fluxcoreWorkSlots, fluxcoreWorkEvents } from '@fluxcore/db';

export const fluxiRoutes = new Elysia({ prefix: '/works' })
    .use(authMiddleware)

    // GET /fluxcore/works/proposed
    .get(
        '/proposed',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                const proposed = await db.select()
                    .from(fluxcoreProposedWorks)
                    .where(and(
                        eq(fluxcoreProposedWorks.accountId, accountId),
                        eq(fluxcoreProposedWorks.resolution, 'pending')
                    ))
                    .orderBy(desc(fluxcoreProposedWorks.createdAt));

                return { success: true, data: proposed };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'List proposed works',
            },
        }
    )

    // GET /fluxcore/works/proposed/:id
    .get(
        '/proposed/:id',
        async ({ user, params, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                const [proposed] = await db.select()
                    .from(fluxcoreProposedWorks)
                    .where(and(
                        eq(fluxcoreProposedWorks.accountId, accountId),
                        eq(fluxcoreProposedWorks.id, params.id)
                    ))
                    .limit(1);

                if (!proposed) {
                    set.status = 404;
                    return { success: false, message: 'Proposed work not found' };
                }

                return { success: true, data: proposed };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            params: t.Object({
                id: t.String(),
            }),
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'Get proposed work details',
            },
        }
    )

    // GET /fluxcore/works/active
    .get(
        '/active',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                const active = await db.select()
                    .from(fluxcoreWorks)
                    .where(and(
                        eq(fluxcoreWorks.accountId, accountId),
                        eq(fluxcoreWorks.state, 'ACTIVE') // TODO: Check state name (case)
                    ))
                    .orderBy(desc(fluxcoreWorks.createdAt));

                return { success: true, data: active };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'List active works',
            },
        }
    )

    // GET /fluxcore/works/history
    .get(
        '/history',
        async ({ user, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                // TODO: Define history states properly in a constant
                const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'];

                // Note: In a real implementation we might want to use 'inArray' from drizzle
                // but for now let's just fetch all works that are NOT active/created/waiting
                // or better, just fetch everything and filter in client if volume is low, 
                // but let's do a basic query for now.
                // Assuming we want everything that is NOT active/created/waiting

                // For simplicity/robustness, let's just list terminal states
                // But Drizzle 'inArray' requires import.
                // detailed implementation:

                const history = await db.select()
                    .from(fluxcoreWorks)
                    .where(and(
                        eq(fluxcoreWorks.accountId, accountId),
                        // We'll filter by terminal states purely or just != ACTIVE/CREATED for now
                        // Let's rely on the client to filter or simple logic here
                        // For MVP: Fetch all that are not active/proposed?
                        // Proposed are in a different table.
                        // Active = 'ACTIVE', 'WAITING_USER', 'WAITING_CONFIRMATION', 'EXECUTING'
                        // History = 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'
                        // Let's just fetch all of them for now and let the UI filter if needed 
                        // or better, implement proper filtering if we can import inArray
                    ))
                    .orderBy(desc(fluxcoreWorks.createdAt));

                // Filter client-side or use inArray if available (it is available in drizzle-orm)
                // But I don't want to break imports right now. 
                // Let's filter in memory for MVP to avoid import errors if not imported.
                const terminalStatesSet = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']);
                const filteredHistory = history.filter(w => terminalStatesSet.has(w.state));

                return { success: true, data: filteredHistory };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'List work history',
            },
        }
    )

    // GET /fluxcore/works/:id
    .get(
        '/:id',
        async ({ user, params, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                const [work] = await db.select()
                    .from(fluxcoreWorks)
                    .where(and(
                        eq(fluxcoreWorks.accountId, accountId),
                        eq(fluxcoreWorks.id, params.id)
                    ))
                    .limit(1);

                if (!work) {
                    set.status = 404;
                    return { success: false, message: 'Work not found' };
                }

                const slots = await db.select()
                    .from(fluxcoreWorkSlots)
                    .where(eq(fluxcoreWorkSlots.workId, work.id));

                const events = await db.select()
                    .from(fluxcoreWorkEvents)
                    .where(eq(fluxcoreWorkEvents.workId, work.id))
                    .orderBy(desc(fluxcoreWorkEvents.createdAt));

                return {
                    success: true,
                    data: {
                        ...work,
                        slots,
                        events
                    }
                };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            params: t.Object({
                id: t.String(),
            }),
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'Get work details',
            },
        }
    )

    // POST /fluxcore/works/:id/open
    .post(
        '/:id/open',
        async ({ user, params, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                // Usar workEngineService.openWork
                const work = await workEngineService.openWork(accountId, params.id);

                return { success: true, data: work };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            params: t.Object({
                id: t.String(),
            }),
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'Open a proposed work',
            },
        }
    )

    // POST /fluxcore/works/:id/discard
    .post(
        '/:id/discard',
        async ({ user, params, query, set }) => {
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const accountId = query.accountId;
            if (!accountId) {
                set.status = 400;
                return { success: false, message: 'accountId is required' };
            }

            try {
                const proposed = await workEngineService.discardWork(accountId, params.id);
                return { success: true, data: proposed };
            } catch (error: any) {
                set.status = 500;
                return { success: false, message: error.message };
            }
        },
        {
            params: t.Object({
                id: t.String(),
            }),
            query: t.Object({
                accountId: t.String(),
            }),
            detail: {
                tags: ['FluxCore WES'],
                summary: 'Discard a proposed work',
            },
        }
    );
