
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🚀 Actualizando definiciones de WES con instrucciones de campo...');

    const definitions = [
        {
            typeId: 'template_creation_v1',
            name: 'Creación de Plantilla',
            slots: [
                { path: 'name', type: 'string', required: true, description: 'Nombre corto e identificativo de la plantilla (ej: "Promo MELA 2000")' },
                { path: 'content', type: 'string', required: true, description: 'El texto completo de la plantilla. Incluye variables en formato {{variable}} si es necesario.' },
                { path: 'category', type: 'string', required: false, description: 'Categoría opcional (ej: "Ventas", "Soporte")' },
                { path: 'allow_automated_use', type: 'boolean', required: false, description: 'Si la IA tiene permiso para usar esta plantilla automáticamente.' }
            ]
        },
        {
            typeId: 'instruction_improvement_v1',
            name: 'Mejora de Instrucciones',
            slots: [
                { path: 'feedback', type: 'string', required: true, description: 'El problema o mejora detectada en la atención actual.' },
                { path: 'proposed_change', type: 'string', required: true, description: 'El texto exacto o regla que se debe añadir a la instrucción privada.' }
            ]
        }
    ];

    const accountId = '5f96c4c5-473b-4574-93ce-53f54225dd18';

    for (const def of definitions) {
        console.log(`📦 Procesando ${def.typeId}...`);
        
        await db.insert(fluxcoreWorkDefinitions)
            .values({
                accountId,
                typeId: def.typeId,
                name: def.name,
                version: '1.1.0',
                definitionJson: {
                    bindingAttribute: def.slots[0].path,
                    slots: def.slots,
                }
            })
            .onConflictDoUpdate({
                target: [fluxcoreWorkDefinitions.accountId, fluxcoreWorkDefinitions.typeId, fluxcoreWorkDefinitions.version],
                set: {
                    definitionJson: {
                        bindingAttribute: def.slots[0].path,
                        slots: def.slots,
                    }
                }
            });
    }

    console.log('✅ WES actualizado con éxito.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
