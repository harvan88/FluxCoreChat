
import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/auth.middleware';
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export const definitionsRoutes = new Elysia({ prefix: '/definitions' })
    .use(authMiddleware)
    
    // Listar todas las definiciones de la cuenta
    .get('/', async ({ user, query, set }) => {
        if (!user) return { success: false, message: 'Unauthorized' };
        const accountId = query.accountId;
        
        try {
            const defs = await db.select().from(fluxcoreWorkDefinitions)
                .where(eq(fluxcoreWorkDefinitions.accountId, accountId));
            
            // Mapeo explícito para asegurar camelCase
            const mappedDefs = defs.map(d => ({
                ...d,
                typeId: (d as any).type_id || (d as any).typeId
            }));

            return { success: true, data: mappedDefs };
        } catch (error: any) {
            set.status = 500;
            return { success: false, message: error.message };
        }
    }, {
        query: t.Object({ accountId: t.String() })
    })

    // Obtener una definición específica
    .get('/:id', async ({ params, set }) => {
        try {
            const [def] = await db.select().from(fluxcoreWorkDefinitions)
                .where(eq(fluxcoreWorkDefinitions.id, params.id))
                .limit(1);
            if (!def) return { success: false, message: 'Not found' };
            return { success: true, data: def };
        } catch (error: any) {
            set.status = 500;
            return { success: false, message: error.message };
        }
    })

    // Actualizar definición (Slots, FSM, etc.)
    .patch('/:id', async ({ params, body, set }) => {
        try {
            const [updated] = await db.update(fluxcoreWorkDefinitions)
                .set({
                    typeId: body.typeId,
                    definitionJson: body.definitionJson,
                })
                .where(eq(fluxcoreWorkDefinitions.id, params.id))
                .returning();
            
            return { success: true, data: updated };
        } catch (error: any) {
            set.status = 500;
            return { success: false, message: error.message };
        }
    }, {
        body: t.Object({
            typeId: t.Optional(t.String()),
            definitionJson: t.Any()
        })
    });
