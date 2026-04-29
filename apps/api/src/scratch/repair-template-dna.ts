import { db } from '../db/index.ts';
import { fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function repair() {
    const newDef = {
        bindingAttribute: 'name',
        slots: [
            {
                path: 'name',
                type: 'string',
                required: true,
                description: 'Nombre corto e identificativo de la plantilla (ej: "Promo MELA 2000")'
            },
            {
                path: 'content',
                type: 'string',
                required: true,
                description: 'El texto completo de la plantilla. Incluye variables en formato {{variable}} si es necesario.'
            },
            {
                path: 'category',
                type: 'string',
                required: false,
                description: 'Categoría opcional (ej: "Ventas", "Soporte")'
            },
            {
                path: 'allow_automated_use',
                type: 'boolean',
                required: false,
                description: 'Si la IA tiene permiso para usar esta plantilla automáticamente.'
            }
        ],
        fsm: {
            initial: 'DRAFT',
            states: ['DRAFT', 'COMPLETED', 'CANCELLED'],
            transitions: [
                {
                    from: 'DRAFT',
                    to: 'COMPLETED',
                    trigger: 'finish'
                }
            ]
        },
        policies: {
            autoOpen: true
        }
    };

    console.log('🧬 Iniciando reparación de ADN para 969eb414...');
    
    await db.update(fluxcoreWorkDefinitions)
        .set({ 
            definitionJson: newDef,
            version: '1.2.0' // Bump version for traceability
        })
        .where(eq(fluxcoreWorkDefinitions.id, '969eb414-959c-406d-8700-e2ca843c4eb3'));

    console.log('✅ REPARACIÓN EXITOSA: platform_manage_template ahora es determinista.');
    process.exit(0);
}

repair().catch(err => {
    console.error('❌ Error en reparación:', err);
    process.exit(1);
});
