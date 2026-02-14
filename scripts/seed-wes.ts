
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { randomUUID } from 'crypto';

async function seedWorkDefinition() {
    const accountId = '4c3a23e2-3c48-4ed6-afbf-21c47e59bc00';

    const [def] = await db.insert(fluxcoreWorkDefinitions).values({
        id: randomUUID(),
        accountId,
        typeId: 'appointment_booking_v1',
        version: '1.0.0',
        definitionJson: {
            // Atributo vinculante: si la IA encuentra esto, puede proponer el trabajo
            bindingAttribute: 'appointment_date',
            slots: [
                { path: 'appointment_date', type: 'string', required: true, description: 'Fecha del turno' },
                { path: 'appointment_time', type: 'string', required: false, description: 'Hora del turno' },
                { path: 'service_type', type: 'string', required: false, description: 'Tipo de servicio' }
            ],
            fsm: {
                initial: 'DRAFT',
                states: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
                transitions: [
                    { from: 'DRAFT', to: 'CONFIRMED', trigger: 'payment_received' }
                ]
            },
            policies: {
                autoOpen: true // Si tiene el bindingAttribute, abrir automáticamente
            }
        },
        createdAt: new Date(),
        updatedAt: new Date()
    }).returning();

    console.log('--- WORK DEFINITION SEEDED ---');
    console.log(JSON.stringify(def, null, 2));
    process.exit(0);
}

seedWorkDefinition().catch(console.error);
